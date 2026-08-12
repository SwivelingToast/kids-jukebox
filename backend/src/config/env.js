import path from 'node:path';

const required = [
  'SPOTIFY_CLIENT_ID',
  'SPOTIFY_CLIENT_SECRET',
  'SPOTIFY_REDIRECT_URI',
  'SESSION_SECRET',
  'PARENT_INITIAL_PIN',
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(
    `Missing required environment variable(s): ${missing.join(', ')}. See .env.example.`
  );
}

if (!/^\d{4,}$/.test(process.env.PARENT_INITIAL_PIN)) {
  throw new Error('PARENT_INITIAL_PIN must be at least 4 digits.');
}

export const env = {
  spotifyClientId: process.env.SPOTIFY_CLIENT_ID,
  spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  spotifyRedirectUri: process.env.SPOTIFY_REDIRECT_URI,
  sessionSecret: process.env.SESSION_SECRET,
  parentInitialPin: process.env.PARENT_INITIAL_PIN,
  port: Number(process.env.PORT) || 3000,
  dataDir: path.resolve(process.env.DATA_DIR || './src/data'),
};
