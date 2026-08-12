# --- build frontend ---
FROM node:20-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# --- backend runtime ---
FROM node:20-slim AS backend
WORKDIR /app/backend
# better-sqlite3 is a native module: it tries to fetch a prebuilt binary
# first, but falls back to compiling from source via node-gyp if that
# download fails for any reason - which needs Python and a C++ toolchain.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY backend/package*.json ./
RUN npm install --omit=dev
COPY backend/ ./
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "src/server.js"]
