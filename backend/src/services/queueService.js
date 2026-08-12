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

export function getQueueState() {
  const playback = db.prepare('SELECT * FROM playback_state WHERE id = 1').get();
  const nowPlayingTrack = playback.now_playing_uri
    ? db.prepare('SELECT * FROM tracks WHERE uri = ?').get(playback.now_playing_uri)
    : null;

  const queueRows = db
    .prepare(
      `SELECT q.id, q.added_at, q.added_by, t.*
       FROM queue q JOIN tracks t ON t.uri = q.track_uri
       ORDER BY q.position ASC`
    )
    .all();

  return {
    nowPlaying: nowPlayingTrack ? toTrackDto(nowPlayingTrack) : null,
    isPlaying: Boolean(playback.is_playing),
    queue: queueRows.map((row) => ({
      id: row.id,
      track: toTrackDto(row),
      addedAt: row.added_at,
      addedBy: row.added_by,
    })),
  };
}

export const enqueue = db.transaction((trackUri, addedBy) => {
  const { maxPosition } = db
    .prepare('SELECT COALESCE(MAX(position), -1) as maxPosition FROM queue')
    .get();
  db.prepare(
    'INSERT INTO queue (track_uri, position, added_by, added_at) VALUES (?, ?, ?, ?)'
  ).run(trackUri, maxPosition + 1, addedBy, Date.now());
  return getQueueState();
});

export const advance = db.transaction(() => {
  const next = db.prepare('SELECT * FROM queue ORDER BY position ASC LIMIT 1').get();

  if (!next) {
    db.prepare(
      'UPDATE playback_state SET now_playing_uri = NULL, now_playing_started_at = NULL, is_playing = 0, updated_at = ? WHERE id = 1'
    ).run(Date.now());
    return getQueueState();
  }

  db.prepare('DELETE FROM queue WHERE id = ?').run(next.id);
  db.prepare(
    'UPDATE playback_state SET now_playing_uri = ?, now_playing_started_at = ?, is_playing = 1, updated_at = ? WHERE id = 1'
  ).run(next.track_uri, Date.now(), Date.now());

  return getQueueState();
});

export function removeItem(id) {
  db.prepare('DELETE FROM queue WHERE id = ?').run(id);
  return getQueueState();
}

export const reorder = db.transaction((orderedIds) => {
  const updateStmt = db.prepare('UPDATE queue SET position = ? WHERE id = ?');
  orderedIds.forEach((id, index) => updateStmt.run(index, id));
  return getQueueState();
});

export function clear() {
  db.prepare('DELETE FROM queue').run();
  return getQueueState();
}

export function setPlaybackFlag(isPlaying) {
  db.prepare('UPDATE playback_state SET is_playing = ?, updated_at = ? WHERE id = 1').run(
    isPlaying ? 1 : 0,
    Date.now()
  );
}
