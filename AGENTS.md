# Repository Guidelines

## Project Structure
- Monorepo with two workspaces: `aelea/` (library) and `website/` (docs/demos). Run commands from repo root unless noted.
- Library code lives in `aelea/src` (domains: `stream`, `stream-extended`, `router`, `ui`, `ui-components`, `ui-components-theme(-browser)`). Generated ESM + d.ts output goes to `aelea/dist`; never edit it directly. Benchmarks sit in `aelea/benchmark`.
- Root configs (`tsconfig.base.json`, `biome.json`, changesets) are shared across packages.

## Build, Test, and Development
- `bun install` — install dependencies (Bun 1.3.x expected per packageManager).
- `bun run aelea:build` — clean + build the library (removes `dist`, runs `tsc -b`).
- `bun run website:build` — build the docs/site; `bun run build` builds both workspaces.
- Inside `aelea/`: `bun run tsc:check` for types; `bun run bench` / `bun run bench:combinators` for perf checks. Inside `website/`: `bun run dev` for Vite dev server, `bun run tsc:check` for type-only.

## Coding Style
- TypeScript in strict mode; ESNext modules with `verbatimModuleSyntax`. Prefer pure functions and stream composition over side effects.
- Use 2-space indent, 120-char lines, single quotes, semicolons as needed. Use `export type`/`import type` where appropriate.
- Naming: components and element factories use `$Name` (e.g., `$Counter`); behaviors use `[stream, streamTether]`; keep hyphenated folder/file segments consistent (`ui-components-theme-browser`).

## Writing Aelea UI (from CLAUDE.md and demos)
- Components are curried IO: first call supplies inputs, second call wires outputs/behaviors. Typical shape: `$Component(inputs)({ outputs })` where inputs can be values or streams, outputs are tethers/behaviors you connect.
- Example tether wiring (keep transforms inside the tether, use `o()` for the pipeline itself): 
  ```ts
  const clickTether = o(nodeEvent('click'), map(event => event.clientX), sampleMap(x => ({ x })))
  const saveButton = $Button({ label: 'Save' })({ click: clickTether })
  ```
- Element factories already compose; use `o()` only for stream/tether pipelines (state transforms, event shaping). Element trees compose directly: `$row(spacing.default, style(...))($text('Hi'))`.
- Common operators: `map`, `sampleMap`, `switchMap` for dynamic UI, `joinMap`+`until` for add/remove lifecycles, `start` for initial values, `multicast` for sharing expensive streams.
- Tether pattern: pass transformers into the tether rather than mutating state — e.g., `clickTether(o(nodeEvent('click'), map(e => e.clientX)))`.
- When improving demos (`website/src/pages/examples`), favor small components, clear stream names, and explicit state flows (parent owns state; children emit changes).
- List/state patterns (see `website/src/pages/examples/count-counters/$CountCounters.ts` and `website/src/pages/examples/toast-queue/$ToastQueue.ts`):
  - Treat the list as a stream input; derive slices (`map`, `switchMap`, `skipRepeatsWith`) to avoid rerenders that don't change shape.
  - Emit structural changes as events and fold them into new lists; example reducer shape:
    ```ts
    type ListEvent<T> = { type: 'add'; item: T } | { type: 'update'; id: string; value: T } | { type: 'remove'; id: string }
    const items = reduce<ListEvent<Item>, Item[]>(event => {
      if (event.type === 'add') return [...list, event.item]
      if (event.type === 'update') return list.map(x => x.id === event.id ? { ...x, ...event.value } : x)
      return list.filter(x => x.id !== event.id)
    }, initialList, merge(add$, update$, remove$))
    ```
  - Keep child components stateless: they receive `item$` or `value$` and emit `change`/`dismiss` streams; parents own the reducer and wiring.

## Testing Guidelines
- No dedicated test runner; rely on `bun run tsc:check` and targeted benches. Add lightweight repros near the module or under `aelea/benchmark` (follow names like `test-map-fusion.ts`).
- Note any manual checks in PR descriptions.

## Commit & Pull Request Guidelines
- Commit subjects: present-tense, imperative (e.g., `Add stream throttling helper`). Keep commits focused; squash noisy fixups.
- PRs: describe scope, risk, and user impact; list commands run (Biome, builds, benches); add screenshots/snippets for UI changes; reference related issues when relevant.
