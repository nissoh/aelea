# Repository Guidelines

## Project Structure
- Monorepo with two workspaces: `aelea/` (library) and `website/` (docs/demos). Run commands from repo root unless noted.
- Library code lives in `aelea/src` (domains: `stream`, `stream-extended`, `router`, `ui`, `ui-components`, `ui-components-theme(-browser)`). Generated ESM + d.ts output goes to `aelea/dist`; never edit it directly. Benchmarks sit in `aelea/benchmark`.
- Root configs (`tsconfig.base.json`, `biome.json`, changesets) are shared across packages.

## Build, Test, and Development
- `bun install` — install dependencies (Bun 1.2.x expected).
- `bun run aelea:build` — clean + build the library (removes `dist`, runs `tsc -b`).
- `bun run website:build` — build the docs/site; `bun run build` builds both workspaces.
- `bun run biome:check` / `bun run biome:check:fix` — lint/format repo-wide (fix variant applies safe changes).
- Inside `aelea/`: `bun run tsc:check` for types; `bun run bench` / `bun run bench:combinators` for perf checks. Inside `website/`: `bun run dev` for Vite dev server, `bun run tsc:check` for type-only.

## Coding Style
- TypeScript in strict mode; ESNext modules with `verbatimModuleSyntax`. Prefer pure functions and stream composition over side effects.
- Biome enforces 2-space indent, 120-char lines, single quotes, semicolons as needed. Use `export type`/`import type` where appropriate.
- Naming: components and element factories use `$Name` (e.g., `$Counter`); behaviors use `[stream, streamTether]`; keep hyphenated folder/file segments consistent (`ui-components-theme-browser`).

## Writing Aelea UI (from CLAUDE.md and demos)
- Components are curried IO: first call supplies inputs, second call wires outputs/behaviors. Example: `$Counter(value)({ valueChange: tether })`.
- Element factories already compose; use `o()` only for stream/tether pipelines. Element trees compose directly: `$row(spacing.default, style(...))($text('Hi'))`.
- Common operators: `map`, `sampleMap`, `switchMap` for dynamic UI, `joinMap`+`until` for add/remove lifecycles, `start` for initial values, `multicast` for sharing expensive streams.
- Tether pattern: pass transformers into the tether rather than mutating state — e.g., `clickTether(o(nodeEvent('click'), map(e => e.clientX)))`.
- When improving demos (`website/src/pages/examples`), favor small components, clear stream names, and explicit state flows (parent owns state; children emit changes).

## Testing Guidelines
- No dedicated test runner; rely on `bun run tsc:check` and targeted benches. Add lightweight repros near the module or under `aelea/benchmark` (follow names like `test-map-fusion.ts`).
- Note any manual checks in PR descriptions.

## Commit & Pull Request Guidelines
- Commit subjects: present-tense, imperative (e.g., `Add stream throttling helper`). Keep commits focused; squash noisy fixups.
- PRs: describe scope, risk, and user impact; list commands run (Biome, builds, benches); add screenshots/snippets for UI changes; reference related issues when relevant.
