import { db } from '../db/index.js';

function toTrackDto(row) {
  return {
    uri: row.uri,
    name: row.name,
    artists: JSON.parse(row.artists),
    albumName: row.album_name,
    albumArtUrl: row.album_art_url,
    durationMs: row.duration_ms,
  };
}

export function getApprovedLibrary() {
  const playlistUris = new Set(
    db.prepare('SELECT DISTINCT track_uri FROM playlist_tracks').all().map((r) => r.track_uri)
  );
  const overrides = db.prepare('SELECT track_uri, action FROM overrides').all();

  const addedUris = new Set();
  const removedUris = new Set();
  for (const o of overrides) {
    if (o.action === 'add') addedUris.add(o.track_uri);
    else removedUris.add(o.track_uri);
  }

  const finalUris = new Set([...playlistUris, ...addedUris]);
  for (const uri of removedUris) finalUris.delete(uri);

  if (finalUris.size === 0) return [];

  const placeholders = [...finalUris].map(() => '?').join(',');
  const rows = db
    .prepare(`SELECT * FROM tracks WHERE uri IN (${placeholders})`)
    .all(...finalUris);

  return rows.map((row) => ({
    ...toTrackDto(row),
    source: addedUris.has(row.uri) ? 'manual' : 'playlist',
  }));
}

export function isApproved(uri) {
  return getApprovedLibrary().some((track) => track.uri === uri);
}

export function getOverrides() {
  const rows = db.prepare('SELECT o.*, t.name, t.artists, t.album_art_url FROM overrides o JOIN tracks t ON t.uri = o.track_uri ORDER BY o.added_at DESC').all();
  return rows.map((row) => ({
    uri: row.track_uri,
    action: row.action,
    addedAt: row.added_at,
    name: row.name,
    artists: JSON.parse(row.artists),
    albumArtUrl: row.album_art_url,
  }));
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

export function setOverride(action, trackUri, trackMetadata) {
  if (trackMetadata) {
    const artists = Array.isArray(trackMetadata.artists)
      ? JSON.stringify(trackMetadata.artists)
      : trackMetadata.artists;
    upsertTrackStmt.run({ ...trackMetadata, artists });
  }
  db.prepare(
    `INSERT INTO overrides (track_uri, action, added_at) VALUES (?, ?, ?)
     ON CONFLICT (track_uri) DO UPDATE SET action = excluded.action, added_at = excluded.added_at`
  ).run(trackUri, action, Date.now());
}

export function removeOverride(trackUri) {
  db.prepare('DELETE FROM overrides WHERE track_uri = ?').run(trackUri);
}
