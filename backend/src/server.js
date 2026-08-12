import express from 'express';
import session from 'express-session';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.js';
import { db } from './db/index.js';
import { ensureSeeded } from './services/pinService.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRouter } from './routes/auth.js';
import { spotifyRouter } from './routes/spotify.js';
import { playlistsRouter } from './routes/playlists.js';
import { libraryRouter } from './routes/library.js';
import { catalogRouter } from './routes/catalog.js';
import { queueRouter } from './routes/queue.js';

import createSqliteStore from 'better-sqlite3-session-store';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

ensureSeeded();

const app = express();
app.set('trust proxy', 1); // behind Caddy - trust X-Forwarded-Proto for secure cookies

app.use(express.json());

const SqliteStore = createSqliteStore(session);
app.use(
  session({
    store: new SqliteStore({ client: db, expired: { clear: true, intervalMs: 15 * 60 * 1000 } }),
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      httpOnly: true,
      // In production this sits behind Caddy's HTTPS; in local dev the
      // Vite/Express servers talk over plain http, where a Secure cookie
      // would silently never be sent back by the browser.
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 90 * 24 * 60 * 60 * 1000,
    },
  })
);

app.use('/api/auth', authRouter);
app.use('/api/spotify', spotifyRouter);
app.use('/api/playlists', playlistsRouter);
app.use('/api/library', libraryRouter);
app.use('/api/catalog', catalogRouter);
app.use('/api/queue', queueRouter);

const distDir = path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(distDir));
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`Kids jukebox backend listening on port ${env.port}`);
});
