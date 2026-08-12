# Kids Jukebox

A touchscreen jukebox for kids, backed by a Spotify playlist a parent controls. Kids browse big album-cover buttons, tap to queue a song, and search only within the approved list. Parents manage the approved songs and queue either from a hidden PIN-gated screen on the tablet itself or from any other device on the network.

## How it works

- **Kid Home (`/`)**: big album-art grid, tap-to-enqueue, search, now-playing bar with skip. No PIN required.
- **Parent Settings (`/parent`)**: PIN-gated. Connect Spotify, link playlists, manually approve/block individual songs, manage the queue, change the PIN. Reachable from the tablet (long-press the small dot in the corner of the Home screen) or from any other device pointed at the same URL.
- Playback runs through Spotify's Web Playback SDK in the tablet's browser tab, so the tablet itself becomes a Spotify Connect device. **Requires a Spotify Premium account.**

## Prerequisites

1. **Spotify Premium** account for the family.
2. Register an app at [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard). Note the Client ID and Client Secret, and add a Redirect URI that matches exactly what you'll set as `SPOTIFY_REDIRECT_URI` (e.g. `https://your-domain.example/api/spotify/callback`).
3. **HTTPS**: Spotify's Web Playback SDK refuses to run over plain `http://` from anything other than `localhost`. Point your existing Caddy reverse proxy at this app's container (port `3000`) — Caddy's automatic HTTPS covers this. If your Caddy setup is LAN-only with no public domain, install Caddy's internal root CA on the tablet and any parent device once.
4. **Tablet**: an Android tablet running Chrome or Firefox. Spotify's Web Playback SDK does **not** support Safari/iPadOS.

## First-time setup

1. Copy `.env.example` to `.env` and fill in:
   - `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI` — from your Spotify Developer app.
   - `SESSION_SECRET` — any long random string.
   - `PARENT_INITIAL_PIN` — a PIN of your choosing (4+ digits). This seeds the parent PIN **once**, the very first time the server starts with an empty database. It is never re-read after that, even if you edit `.env` later — the server refuses to boot if this variable is missing at all, but it stops mattering after first boot.
2. `docker compose up -d` — see [Deploying](#deploying) below for whether this builds locally or pulls a prebuilt image.
3. Point Caddy at this container's port `3000`.
4. Visit `https://your-domain.example/parent` and log in with `PARENT_INITIAL_PIN`. You'll be **forced** to set a new PIN before you can do anything else — this replaces the seed value.
5. Connect Spotify, then link a playlist (paste its share link).
6. Open `https://your-domain.example/` on the tablet and add it to the home screen for a fullscreen feel.

## Deploying

Every push to `main` triggers [`.github/workflows/docker-publish.yml`](.github/workflows/docker-publish.yml), which builds the image and pushes it to `ghcr.io/swivelingtoast/kids-jukebox:latest`. `docker-compose.yml` lists both `image:` and `build: .`, so:

- **Pulling the published image (no source needed on the server)**: copy just `docker-compose.yml` and `.env` to the media server, then:
  ```bash
  docker compose pull
  docker compose up -d
  ```
- **Building locally instead** (e.g. testing an uncommitted change): `docker compose up --build -d` — this builds from the local `Dockerfile` and ignores the remote image for that run.

**Package visibility**: GitHub Container Registry packages are private by default, tied to the repo. If `docker compose pull` fails with an auth error, either:
- make the package public — on GitHub, go to the repo → **Packages** (right sidebar) → `kids-jukebox` → **Package settings** → **Change visibility** → Public, or
- keep it private and `docker login ghcr.io` on the media server once with a GitHub personal access token that has `read:packages` scope.

Since this app already handles a Spotify refresh token and a family PIN, keeping the image private (and just logging in once) is the more consistent choice with the rest of this app's security posture — but either works.

### Forgotten PIN

There's no self-service reset (this is a single-family app with no email/account system). To reset: stop the container, delete the single row from the `pin` table in the sqlite database (in the `jukebox-data` Docker volume), and restart — the server will re-seed from `PARENT_INITIAL_PIN` in `.env` and force a change again, same as first-run.

```
docker compose exec kids-jukebox node -e "require('better-sqlite3')('src/data/jukebox.db').prepare('DELETE FROM pin').run()"
docker compose restart
```

## Local development

Two terminals:

```bash
cd backend && npm install && npm run dev    # Express API on :3000
cd frontend && npm install && npm run dev   # Vite dev server on :5173, proxies /api to :3000
```

You'll still need a `.env` in `backend/` (or the repo root, loaded via your shell) with the same variables as above. Note the Web Playback SDK secure-context requirement still applies — `http://localhost:5173` counts as secure, so local dev works without extra HTTPS setup.

Open http://localhost:5173.

## Notes

- Playback state, the approved-song list, and the queue all live in a single sqlite file inside the `jukebox-data` volume — back that up if you care about not re-linking playlists after a redeploy.
- Kid-facing endpoints (browsing, search, enqueue, skip) are intentionally unauthenticated by design — only the `/parent` routes require the PIN.
