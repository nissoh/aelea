# syntax=docker/dockerfile:1.7

# ── Stage 1: install deps (cached as long as lockfiles are unchanged) ──
FROM oven/bun:1-alpine AS deps
WORKDIR /app

# All workspace manifests so the frozen install matches the root lockfile graph.
COPY package.json bun.lock ./
COPY aelea/package.json ./aelea/
COPY website/package.json ./website/
COPY company/package.json ./company/

# BuildKit cache mount reuses bun's downloaded packages across builds even
# when the lockfile changes.
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

# ── Stage 2: build ──
FROM deps AS build
WORKDIR /app
COPY tsconfig.base.json ./
COPY aelea ./aelea
COPY company ./company
RUN bun run aelea:build && bun run company:build

# ── Stage 3: serve with Caddy ──
FROM caddy:2-alpine
WORKDIR /srv
COPY --from=build /app/company/dist /srv/dist
COPY company/Caddyfile /etc/caddy/Caddyfile
EXPOSE 80
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]
