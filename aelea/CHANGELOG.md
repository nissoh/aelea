# aelea

## 4.0.0

### Major Changes

Breaking renames and API reshapes across theme, scrolling, and layout primitives. Also a new pending-async UI module and several internal type/correctness improvements.

#### Theme

- `pallete` → `palette`. The global, the `Palette` type (was `Pallete`), and the `Theme.palette` property all renamed. No deprecated alias kept; consumers must rename.
- **Runtime `palette` is now CSS variable references.** Each role maps to `var(--…)` (e.g. `palette.foreground` → `'var(--foreground)'`). Theme switches at runtime work by swapping the `<body>` class; CSS resolves the vars to whichever theme stylesheet is active, and class-hashed `style({...})` rules update automatically. Previously `palette` held hex strings, which class-bake at module load and ignore subsequent theme changes — the picker fired but had no visual effect. `theme.palette` continues to hold literal hex values for code that needs them (theme picker swatches via `theme.palette.foreground` etc.).
- `writeTheme` no longer mutates the runtime `palette` (the var refs are constant); it only updates the `theme` record and `themeList`.
- Apps must define a `--shade-pole` CSS variable per theme (`white` on light, `black` on dark) — `colorShade` mixes toward it. Existing theme stylesheets need this added.
- `aelea/ui-components-theme-browser` no longer auto-initializes on import. Apps must wire it up explicitly in their entry point (typically `main.ts` before `render(...)`):

  ```ts
  import { applyTheme, readDomTheme } from 'aelea/ui-components-theme-browser'

  const { themeList, theme } = readDomTheme()
  applyTheme(themeList, theme)
  ```

  This makes theme setup opt-in per renderer — non-DOM renderers (takumi, headless, SSR) can provide their own adapter ending in `writeTheme(...)` without the DOM module's side effects polluting their import graph.
- `colorAlpha` and `convertHexToRGBA` removed. Replaced by `colorShade(color, intensity)` — `intensity` is `0–100` as a **prominence dial** between `--shade-pole` and the input. `intensity = 0` blends fully into the pole; `intensity = 100` returns the input unchanged; intermediate values lerp linearly. Emits a `color-mix(in srgb, ${color} ${intensity}%, var(--shade-pole))` expression — theme reactivity is delegated to CSS. Requires `color-mix()` support (Chrome 111+, Firefox 113+, Safari 16.2+). Examples (resolved by the browser): `colorShade('var(--message)', 25)` on dark → ~`rgb(64,64,64)`; same on light → ~`rgb(191,191,191)`.
- Default palette `message: 'red'` → `'#FF0000'`. (Now only matters for `theme.palette` fallbacks; the runtime `palette` uses CSS vars.)

#### `$VirtualScroll` → `$QuantumScroll`

- `$VirtualScroll` removed. The replacement is `$QuantumScroll` in `aelea/ui-components`.
- `dataSource: IStream<ScrollResponse>` → `dataSource: IStream<Promise<IQuantumScrollPage>>`. Pages are always promise-based and always paged (no array-only shape). Each page's loader UI is rendered via the new `$intermediatePromise` while pending; the next page is requested when an intersection-observer sentinel comes into view.
- Output renamed `scrollIndex: number` → `scrollRequest: IPageRequest` where `IPageRequest = { offset: number; pageSize: number }`. Consumers translate offset → page index themselves if needed.
- Removed types: `IScrollPagableReponse`, `ScrollRequest`, `ScrollResponse`, `QuantumScroll` (the old config interface — new one is `IQuantumScroll`).

#### `$Table`

- `dataSource: IStream<TablePageResponse<T>>` → `IStream<Promise<TablePagedData<T>>>` where `TablePagedData<T> = { data: T[]; offset: number; pageSize: number }`. Synchronous data must be wrapped (`Promise.resolve(...)`).
- Removed array-only response shape — every emission is now a paged response.
- Output renamed `scrollIndex: number` → `scrollRequest: IPageRequest` (matches `$QuantumScroll`).
- `scrollConfig` now extends `IQuantumScroll` (was `QuantumScroll`); `containerOps` replaced by `$container`.
- Removed types: `IPageRequest` (the page-index shape), `TablePageResponse`.

#### `$IntermediateDisplay` (new)

New module under `aelea/ui-components` for pending-async UI:

- `$intermediatePromise<T>({ $display, $loader?, $$fail? })` — given a stream of promises, renders `$loader` while pending, the resolved node when done, `$$fail(error)` on rejection.
- `$spinner` — self-contained SVG/SMIL rotating spinner. No global `@keyframes`, works inside any stacking context.
- `$alertTooltip` — styled error chip with the negative palette role.
- `classifyError(err) → { detail }` — extracts a user-readable message from `Error`, strings, or `{ message }` shapes; falls back to `JSON.stringify`.

#### Layout

- `$seperator` → `$separator`. Typo rename, no alias kept.

#### `$NumberTicker`

- Right-aligned by default. Slots are reverse-indexed (slot 0 = rightmost character) and the container uses `justify-content: flex-end`, so numbers grow leftward into unused capacity instead of dangling left-aligned with trailing empty slots.
- Per-slot dedup is now structural: each slot only re-evaluates its color flash when its own character changes. Previously the entire ticker re-evaluated on every emission regardless of which digits actually changed.
- Source-level dedup fixed. `skipRepeats` after the internal `reduce` was a no-op (each `reduce` tick allocates a fresh state object); replaced with `skipRepeatsWith((a, b) => a.change === b.change)` so identical numeric values don't propagate.
- `textStyle` config option removed — replaced by `$slot?: INodeCompose`. Migrate `textStyle: { fontSize: '30px' }` to `$slot: $defaultNumberTickerSlot(style({ fontSize: '30px' }))`.
- `$container?: INodeCompose` and `$slot?: INodeCompose` exposed as composable overrides; `$defaultNumberTickerContainer` and `$defaultNumberTickerSlot` exported from `aelea/ui-components` so consumers can layer decorators (padding, background, custom tag) without forking the component. Matches the convention used by `$Button` / `$Dropdown` / `$Popover` / `$Tooltip` / `$QuantumScroll`.
- Truncation behavior documented: values whose parsed width exceeds `slots` are truncated to the rightmost `slots` characters (the ticker UX assumption that the latest digits matter most).

#### Popover

- Overlay backdrop no longer relies on `colorAlpha`. Uses element-level `opacity` over `palette.foreground` so dimming follows the active theme without producing tinted color bleed.
- Content centering now reads the popover's actual `clientWidth` via an intersection observer (mirrors the `$Tooltip` pattern); the previous hardcoded `popoverWidth = 400` estimate is gone. Off-anchor or near-edge anchors clamp into viewport with the configured `spacing`.

### Minor Changes

- `ISink` implementations across stream combinators tightened from `error(time, error: any)` → `error(time, error: unknown)`. Aligns 14 sites with the `ISink` interface (which already used `unknown`); forces callers to narrow before reading. No behavior change.

### Internal / Cleanup

- Removed dead commented-out export of `createLocalStorageChain` (file did not exist).
- `I$IntermediatPromise` typo corrected to `I$IntermediatePromise` (this type was introduced and corrected in the same release; not a separately-shipped break).
- Renamed website example `examples/virtual-scroll/` → `examples/quantum-scroll/`; route fragment `virtual-scroll` → `quantum-scroll`. Deep links to the old path break.
- `AGENTS.md` updated: corrected `src/router` → `src/ui-router`, refreshed code samples to use `palette`, replaced `awaitPromises` in the tether example with `switchMap`, documented `bun test`, added gotchas for `awaitPromises` FIFO semantics, `fromPromise` non-cancellation, and the `backdrop-filter` stacking-context trap.

### Migration

- **Theme imports.** `import { pallete } from 'aelea/ui-components-theme'` → `import { palette } from 'aelea/ui-components-theme'`. Same for the type: `Pallete` → `Palette`. Global find/replace across the codebase covers it (e.g. `find . -name '*.ts' | xargs sed -i '' -e 's/pallete/palette/g' -e 's/Pallete/Palette/g'`).
- **Color helpers.** Replace `colorAlpha(color, alpha)` with `colorShade(color, intensity)` where `intensity = Math.round(alpha * 100)` is a starting point — visual review per call site is required because the semantic shifted from "tinted veil" to "opaque luminance step." Box-shadow and modal-overlay sites were the most affected; consider element-level `opacity` for any remaining "translucent layer" use.
- **`$VirtualScroll` → `$QuantumScroll`.** DataSource must yield promises; output is `scrollRequest: { offset, pageSize }` instead of a page index. Seed an initial request with `start({ offset: 0, pageSize }, scrollRequest)` so the first page fetches before any intersection event.
- **`$Table`.** Wrap synchronous data with `Promise.resolve({ data, offset, pageSize })`; switch the bound output from `scrollIndex` to `scrollRequest`.
- **`$seperator` → `$separator`.** Single-token rename.
- **`$NumberTicker.textStyle` → `$slot`.** `$NumberTicker({ value, textStyle: { fontSize: '30px' } })` becomes `$NumberTicker({ value, $slot: $defaultNumberTickerSlot(style({ fontSize: '30px' })) })`. Import `$defaultNumberTickerSlot` from `aelea/ui-components`. Visual layout also flips to right-aligned — if you depended on the prior left-aligned behavior, override `$container` with `$row(style({ justifyContent: 'flex-start' }))`.

## 3.0.0

### Major Changes

- b1eda3e: Major release. Substantial breaking changes across router, scheduler, and renderer surface.

  ## Router (breaking)

  - Removed `aelea/router`. Replaced by `aelea/ui-router` with a declarative schema-based API.
  - New entry point: `createRouteSchema(spec)` builds a typed `RouteNode` tree. `Route.create`/`match`/`contains` fields are gone — `Route` is now `{ fragment, fragments }`.
  - Reactive status is read via `isContaining(route)`, the `match(route)(stream)` mounting op, and the `contains(route)(stream)` mounting op.
  - New `href(node, params?)` derives URLs from the schema; consumers no longer pass `url:` to anchors.
  - `$RouterAnchor` renamed to `$Link`. `IAnchor` now `{ route, params?, $anchor? }`. `$defaultAnchor` styled with hover/focus pseudos and `text-decoration: none`.
  - `$Link`'s `click` output is `IBehavior<INode<HTMLAnchorElement>, string>` (destination URL); enable navigation by tethering it (e.g. `({ click: op })`).

  ## Scheduler (mostly internal, behaviour edge)

  - `Browser`/`NodeScheduler` flush asap-tasks with one shared timestamp per flush (was per-task `performance.now()`); same-tick tasks now agree on `time()`.
  - Recycled asap task array + single-task fast path. Burst workloads (~100 just-subscribes / `at(0)` storms) ~20% faster; trivial pipelines ~10% faster.
  - `BrowserScheduler` no longer carries the `asapCancelled` defensive flag (HTML spec guarantees microtasks drain before timers).

  ## Stream-extended

  - `recover(config, source)` — re-subscribe-after-end with a minimum interval. New combinator.
  - `promiseState`: `PromiseStateError.error` widened from `Error` to `unknown`; rejections pass through unchanged (no more `String(payload)` wrapping). Sink dispose now wired into the disposable chain. Internal `AbortController` removed (was dead code).

  ## Tests

  - New test suite under `aelea/test/` (31 cases): core combinator behavior, `promiseState` semantics, `recover` timing & curry, scheduler dispose paths.
  - `bun test` script available in the package.

  ## Removed peer-dep noise

  - Dropped unused `@resvg/resvg-js`, `@takumi-rs/image-response`, `@types/react`, `react` from `aelea` devDeps.
