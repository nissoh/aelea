# syntax=docker/dockerfile:1.7

# ── Stage 1: install deps (cached as long as lockfiles are unchanged) ──
FROM oven/bun:1-alpine AS deps
WORKDIR /app

# Workspace manifests only — copying source separately keeps install cached
# across code-only changes.
COPY package.json bun.lock ./
COPY aelea/package.json ./aelea/
COPY website/package.json ./website/

# BuildKit cache mount reuses bun's downloaded packages across builds even
# when the lockfile changes — cuts cold installs from ~30s to ~5s.
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

# ── Stage 2: build ──
FROM deps AS build
WORKDIR /app
COPY tsconfig.base.json ./
COPY aelea ./aelea
COPY website ./website
RUN bun run aelea:build && bun run website:build

# ── Stage 3: serve with Caddy ──
FROM caddy:2-alpine
WORKDIR /srv
COPY --from=build /app/website/dist /srv/dist
COPY website/Caddyfile /etc/caddy/Caddyfile
EXPOSE 80
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]
