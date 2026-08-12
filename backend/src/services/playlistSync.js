import { db } from '../db/index.js';
import { spotifyApiFetch } from './spotifyClient.js';

export function parsePlaylistId(input) {
  const trimmed = input.trim();

  const urlMatch = trimmed.match(/playlist\/([a-zA-Z0-9]+)/);
  if (urlMatch) return urlMatch[1];

  const uriMatch = trimmed.match(/^spotify:playlist:([a-zA-Z0-9]+)$/);
  if (uriMatch) return uriMatch[1];

  if (/^[a-zA-Z0-9]+$/.test(trimmed)) return trimmed;

  return null;
}

function mapTrackItem(item) {
  const track = item.track;
  if (!track || !track.uri || track.is_local) return null;
  return {
    uri: track.uri,
    spotifyTrackId: track.id,
    name: track.name,
    artists: JSON.stringify(track.artists.map((a) => a.name)),
    albumName: track.album?.name ?? null,
    albumArtUrl: track.album?.images?.[0]?.url ?? null,
    durationMs: track.duration_ms ?? null,
  };
}

async function fetchAllTracks(playlistId) {
  const tracks = [];
  let nextPath = `/playlists/${playlistId}/tracks`;
  while (nextPath) {
    const page = await spotifyApiFetch(nextPath);
    for (const item of page.items) {
      const mapped = mapTrackItem(item);
      if (mapped) tracks.push(mapped);
    }
    nextPath = page.next ? page.next.replace('https://api.spotify.com/v1', '') : null;
  }
  return tracks;
}

const upsertTrackStmt = db.prepare(
  `INSERT INTO tracks (uri, spotify_track_id, name, artists, album_name, album_art_url, duration_ms)
   VALUES (@uri, @spotifyTrackId, @name, @artists, @albumName, @albumArtUrl, @durationMs)
   ON CONFLICT (uri) DO UPDATE SET
     name = excluded.name,
     artists = excluded.artists,
     album_name = excluded.album_name,
     album_art_url = excluded.album_art_url,
     duration_ms = excluded.duration_ms`
);

const syncTx = db.transaction((playlistRowId, tracks) => {
  db.prepare('DELETE FROM playlist_tracks WHERE playlist_id = ?').run(playlistRowId);
  tracks.forEach((track, index) => {
    upsertTrackStmt.run(track);
    db.prepare(
      'INSERT INTO playlist_tracks (playlist_id, track_uri, position) VALUES (?, ?, ?)'
    ).run(playlistRowId, track.uri, index);
  });
  db.prepare('UPDATE playlists SET last_synced_at = ? WHERE id = ?').run(Date.now(), playlistRowId);
});

export async function linkPlaylist(input) {
  const spotifyPlaylistId = parsePlaylistId(input);
  if (!spotifyPlaylistId) {
    const err = new Error('Could not parse a playlist ID from that input');
    err.status = 400;
    err.publicMessage = err.message;
    throw err;
  }

  const meta = await spotifyApiFetch(
    `/playlists/${spotifyPlaylistId}?fields=id,name,images,owner(id,display_name),public,collaborative`
  );
  console.log(
    `Linking playlist ${spotifyPlaylistId}: owner=${meta.owner?.id} public=${meta.public} collaborative=${meta.collaborative}`
  );
  const tracks = await fetchAllTracks(spotifyPlaylistId);

  const existing = db
    .prepare('SELECT id FROM playlists WHERE spotify_playlist_id = ?')
    .get(spotifyPlaylistId);

  let playlistRowId;
  if (existing) {
    playlistRowId = existing.id;
    db.prepare('UPDATE playlists SET name = ?, image_url = ? WHERE id = ?').run(
      meta.name,
      meta.images?.[0]?.url ?? null,
      playlistRowId
    );
  } else {
    const result = db
      .prepare(
        'INSERT INTO playlists (spotify_playlist_id, name, image_url, linked_at) VALUES (?, ?, ?, ?)'
      )
      .run(spotifyPlaylistId, meta.name, meta.images?.[0]?.url ?? null, Date.now());
    playlistRowId = result.lastInsertRowid;
  }

  syncTx(playlistRowId, tracks);
  return getPlaylistSummary(playlistRowId);
}

export async function resyncPlaylist(playlistRowId) {
  const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(playlistRowId);
  if (!playlist) {
    const err = new Error('Playlist not found');
    err.status = 404;
    throw err;
  }
  const tracks = await fetchAllTracks(playlist.spotify_playlist_id);
  syncTx(playlistRowId, tracks);
  return getPlaylistSummary(playlistRowId);
}

export function getPlaylistSummary(playlistRowId) {
  const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(playlistRowId);
  const { count } = db
    .prepare('SELECT COUNT(*) as count FROM playlist_tracks WHERE playlist_id = ?')
    .get(playlistRowId);
  return {
    id: playlist.id,
    spotifyPlaylistId: playlist.spotify_playlist_id,
    name: playlist.name,
    imageUrl: playlist.image_url,
    trackCount: count,
    lastSyncedAt: playlist.last_synced_at,
  };
}

export function listPlaylists() {
  const rows = db.prepare('SELECT id FROM playlists ORDER BY linked_at ASC').all();
  return rows.map((row) => getPlaylistSummary(row.id));
}

export function deletePlaylist(playlistRowId) {
  db.prepare('DELETE FROM playlists WHERE id = ?').run(playlistRowId);
}
