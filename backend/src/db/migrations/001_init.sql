CREATE TABLE IF NOT EXISTS pin (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  pin_hash TEXT NOT NULL,
  must_change INTEGER NOT NULL DEFAULT 1,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS spotify_auth (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  refresh_token TEXT,
  access_token TEXT,
  access_token_expires_at INTEGER,
  spotify_user_id TEXT,
  scope TEXT,
  connected_at INTEGER
);

CREATE TABLE IF NOT EXISTS playlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  spotify_playlist_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  image_url TEXT,
  linked_at INTEGER NOT NULL,
  last_synced_at INTEGER
);

CREATE TABLE IF NOT EXISTS tracks (
  uri TEXT PRIMARY KEY,
  spotify_track_id TEXT NOT NULL,
  name TEXT NOT NULL,
  artists TEXT NOT NULL,
  album_name TEXT,
  album_art_url TEXT,
  duration_ms INTEGER
);

CREATE TABLE IF NOT EXISTS playlist_tracks (
  playlist_id INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  track_uri TEXT NOT NULL REFERENCES tracks(uri),
  position INTEGER NOT NULL,
  PRIMARY KEY (playlist_id, track_uri)
);

CREATE TABLE IF NOT EXISTS overrides (
  track_uri TEXT PRIMARY KEY REFERENCES tracks(uri),
  action TEXT NOT NULL CHECK (action IN ('add', 'remove')),
  added_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  track_uri TEXT NOT NULL REFERENCES tracks(uri),
  position INTEGER NOT NULL,
  added_by TEXT NOT NULL CHECK (added_by IN ('kid', 'parent')),
  added_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS playback_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  now_playing_uri TEXT,
  now_playing_started_at INTEGER,
  is_playing INTEGER NOT NULL DEFAULT 0,
  device_id TEXT,
  updated_at INTEGER
);

INSERT OR IGNORE INTO playback_state (id, is_playing) VALUES (1, 0);
