# Stage 1: build static site
FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock ./
COPY tsconfig.base.json ./
COPY aelea ./aelea
COPY website ./website
# Install once from repo root, then build library and website
RUN bun install --frozen-lockfile && bun run aelea:build && bun run website:build

# Stage 2: serve with Caddy
FROM caddy:2-alpine
WORKDIR /srv
COPY --from=build /app/website/dist /srv/dist
COPY website/Caddyfile /etc/caddy/Caddyfile
EXPOSE 80
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]
