# aelea

## 4.4.0

### Minor Changes

#### `$Dialog` — generic anchor-tracked top-layer surface

New component in `aelea/ui-components/components/overlay/$Dialog`. Mounts arbitrary content in the browser top layer (via the HTML Popover API), positioned relative to a target element, with per-frame repositioning while open. The shared primitive that `$Popover`, `$Tooltip`, and `$Dropdown` now delegate to.

```ts
import { $Dialog, type IDialogPosition } from 'aelea/ui-components'

const position: IDialogPosition = (anchorEl, contentEl) => {
  const rect = anchorEl.getBoundingClientRect()
  return { top: `${rect.bottom + 8}px`, left: `${rect.left}px` }
}

$Dialog({
  $anchor: $myButton,
  $content: map(open => (open ? $myPanel : null), isOpenStream),
  position
})
```

API:

- `$anchor: I$Node` — the target element. `$Dialog` attaches an `IntersectionObserver` for element-handle delivery to `position`.
- `$content: IStream<I$Node | null>` — single signal: emit a node to open with that body, emit `null` to close. Body is captured directly via switchMap closure, so there's no race between `isOpen` propagation and content delivery (a regression that bit the intermediate refactor).
- `position: (anchorEl, contentEl) => IStyleCSS` — called every animation frame while open. Receives both element refs so positioning can read anchor rect and content size for clamping/flipping.
- `$container?` / `$contentContainer?` — element wrappers, both default to `$node`.

Backdrop, dismiss state machines, hover detection, click-outside handling — all stay in the wrapper components. `$Dialog` is purely the top-layer + positioning primitive.

#### `showPopover` helper exported

Helper for safely calling `el.showPopover()` with capability detection and `:popover-open` cleanup. Exported from `aelea/ui-components` for components that need to put their own elements in the top layer (`$Popover` uses it for the backdrop).

```ts
import { showPopover } from 'aelea/ui-components'

$node(
  attr({ popover: 'manual' }),
  effectRun(showPopover)
)()
```

Returns `void` on engines without the API (graceful no-op) or a `Disposable` whose `[Symbol.dispose]` calls `hidePopover()` if the element is still `:popover-open` at unmount.

### Patch Changes

#### `$Tooltip` and `$Dropdown` now escape transform-trapped containing blocks

Both components used `position: fixed` directly, which becomes anchored to the nearest ancestor with `transform` / `filter` / `perspective` / `backdrop-filter` / `contain: paint` / `will-change: transform` instead of the viewport. Tooltips and dropdowns inside `fadeIn(...)`-style page transitions or any animated wrapper would land at the mid-animation rect of the wrapper, not the actual anchor. The bug class fixed for `$Popover` in 4.3.2 was silently affecting both other components too.

Now both go through `$Dialog`, which uses HTML Popover API top-layer placement. Top-layer elements have the viewport as their containing block regardless of CSS ancestry, so position computations land where they're expected.

#### `$Tooltip` and `$Dropdown` reposition every frame while open

Previously updated on `scroll` / `resize` only. Now both follow their anchor through CSS transitions, JS-driven transforms, parent motion, and any other source uniformly via `requestAnimationFrame`. The diff-and-clear styleInline applier (4.3.0) skips `setProperty` calls when the computed position matches the prior frame, so static-anchor cost is bounded to one `getBoundingClientRect` per frame plus zero DOM writes.

#### Internal: `Z_TARGET_ELEVATED` and `tooltip z-index 5160` removed

Top-layer elements stack above all non-top-layer elements regardless of `z-index`. The elevation constants were dead weight under the new architecture; removed.

## 4.3.2

### Patch Changes

#### `$Popover` no longer trapped by transformed ancestors

The 4.3.1 rAF fix recomputed positions every frame but couldn't cancel out the underlying CSS bug: a `position: fixed` element whose ancestor has `transform` / `filter` / `perspective` / `backdrop-filter` / `contain: paint` / `will-change: transform` becomes anchored to that ancestor's box rather than the viewport. So `$Popover` opened during a `fadeIn(translate(...))` route transition wrote viewport-correct coordinates into a fixed element whose origin was the transforming wrapper — popover stayed offset by the wrapper's transform until the animation completed.

Fix uses the HTML Popover API: both content and overlay get `popover="manual"` and call `showPopover()` post-mount via `effectRun`. Top-layer elements have the viewport as their containing block regardless of CSS ancestry, so `position: fixed` resolves correctly. The rAF tick from 4.3.1 stays — it's now actually doing something useful (tracking the target through any kind of motion).

Browser requirement: Chromium 114+, Safari 17+, Firefox 125+. The implementation is a graceful no-op (`effectRun` callback returns early) on older engines that lack `showPopover`.

`$container` children reordered: overlay declared before content so it enters the top layer first — top-layer stacking is enter-order, not z-index. `Z_OVERLAY` and `Z_CONTENT` constants removed (unused once both elements are in the top layer); target's `Z_TARGET_ELEVATED` retained as documentary scaffolding even though it can't beat top-layer stacking — visible only during the brief mount-but-not-yet-shown window.

#### `effectRun` is now functional

The placeholder `effectRun` decorator from `aelea/ui` previously had no renderer consumer (documented as "no-op placeholder" in the 4.1.0 changelog). The DOM renderer now recognizes `__run__` entries in `propBehavior` and invokes the callback with the element and scheduler post-mount via `scheduler.asap`, so the element is guaranteed attached to its parent by the time the callback fires.

```ts
$node(
  effectRun((el, scheduler) => {
    el.showPopover()
    return disposeWith(() => el.hidePopover())
  })
)()
```

The returned `Disposable | void` is run on unmount, so any imperative DOM-API lifecycle (`showPopover`/`hidePopover`, native event listeners that need explicit teardown, third-party widget mount/dispose pairs) can be expressed directly without falling back to a custom mutator.

## 4.3.1

### Patch Changes

#### `$Popover` content stays glued to the target during transforms / animations

`$Popover` previously recomputed its content position only on `scroll`, `resize`, and IntersectionObserver threshold crossings. None of these fire while an ancestor is in a CSS transition or animation that uses `transform` / `opacity`, so a popover opened during a route fade-in or page-mount slide would land at the target's mid-animation rect and stay there until the user scrolled.

Fix gates a `requestAnimationFrame` ticker on `isOpen` and merges it into the existing `updateEvents` stream:

```ts
const tickWhileOpen = switchMap(open => (open ? animationFrame() : empty), isOpen)

const updateEvents = merge(
  fromEventTarget(window, 'scroll', { capture: true }),
  fromEventTarget(window, 'resize'),
  tickWhileOpen
)
```

While the popover is open, every animation frame triggers a `getBoundingClientRect` and a `styleInline` submit. The submit goes through `makePaintWriter`, so it coalesces to one DOM write per frame, and the post-4.3.0 diff-and-clear applier short-circuits when the computed position matches the prior frame's. Closed popovers pay zero cost — `switchMap` disposes the rAF subscription on `isOpen` flipping false.

Subsumes scroll, resize, layout shift, CSS transitions/animations, JS-driven transforms, and parent-driven motion uniformly. The IntersectionObserver tether is left in place — it still serves as the popover's element-handle delivery for the `getBoundingClientRect` call site, and removing it would be unrelated churn.

#### New `animationFrame()` source

Exported from `aelea/stream-extended` alongside `fromCallback` / `fromPromise`. Returns an `IStream<DOMHighResTimeStamp>` that emits on each `requestAnimationFrame` tick and cancels via `cancelAnimationFrame` on dispose. Useful for any reactive position-tracking that needs to follow CSS-driven motion without an event-listener anchor — not DOM-element-bound, so it lives next to the other generic stream sources rather than in `ui-components/elementObservers`.

## 4.3.0

### Minor Changes

#### Typography scale primitive (`text`)

New `text` const exported from `aelea/ui-components-theme`, parallel to `palette`. Seven semantic font-size steps, each a CSS-variable string with a baked-in fallback so the framework default works with no app-side wiring:

```ts
import { text } from 'aelea/ui-components-theme'

style({ fontSize: text.base }) // 'var(--text-base, 1rem)'
style({ fontSize: text.sm })   // 'var(--text-sm, 0.875rem)'
```

Steps: `xs` (0.75rem), `sm` (0.875rem), `base` (1rem), `lg` (1.125rem), `xl` (1.25rem), `xxl` (1.5rem), `display` (2.25rem). Apps override per-step in any cascade-compatible scope:

```css
:root             { --text-base: 14px }
html.compact      { --text-sm: 0.75rem }
body.large-text   { --text-base: 1.125rem }
```

Typography is intentionally **not** part of the `Theme` shape and the DOM theme loader is unchanged — density / a11y modes belong on independent body classes that compose with theme switching via plain CSS cascade, not on the JS theme record. The `--shade-pole` machinery and `writeTheme` are untouched.

`TextStep` type (`'xs' | 'sm' | 'base' | 'lg' | 'xl' | 'xxl' | 'display'`) exported alongside.

The `aelea/ui-components` design sheet now uses `text.base` for the system base font-size. The public `designSheet.text` mutator (a `style({ fontFamily, fontWeight, fontSize })` group) keeps the same shape; only the internal binding name changed.

### Patch Changes

#### `styleInline` no longer leaks properties across emissions

`styleInline(stream)` previously wrote new keys via `setProperty` on each emission but never cleared keys absent from later emissions. A stream that emitted `{ background: 'red' }` then `{}` would leave `background: red` glued to the inline style forever instead of cascading back to the static class rule.

Fix routes `styleInline` through `makeReactiveStyleApplier` — the same per-channel diff-and-clear applier that `styleBehavior` already used. Each `styleInline(...)` channel now tracks the keys it set on the prior emission and clears the ones absent from the next.

The takumi renderer's `styleInline` / `styleBehavior` paths got a parallel fix via a new per-channel applier — necessary because the takumi `styleState` is shared with static styles, so a channel can only safely clear keys it itself set previously, not arbitrary keys missing from the new emission.

This was the workaround that previously forced authors to repeat every property across every branch (`disabled ? { bg, cursor } : { bg, cursor }`) instead of writing partial overlays (`disabled ? { bg, cursor } : {}`). The latter shape now works as expected.

## 4.1.0

### Minor Changes

Decorator pipeline overhaul focused on render-time performance. Public app-level API unchanged — `style({...})($x)`, `$row(spacing.default, style({...}))`, `attr({id: 'x'})($input)`, etc. all behave identically. The breaks are renderer-internal (`INode` shape, `createStylePseudoRule` removal) and only affect custom-renderer or custom-mutator code; see the migration section.

#### Flat decorator pipeline (new architecture)

- **Built-in decorators (`style`, `stylePseudo`, `styleBehavior`, `styleInline`, `attr`, `attrBehavior`, `effectProp`) no longer wrap their source in a `map(node => …, source)` stream.** Each now carries a `__mutate` hook on the partial form (`style({...})`); the compose pipeline detects it and applies the mutation directly to the freshly-allocated `INode` at mount. (`effectRun` is currently a no-op placeholder and not consumed by any renderer.)
- **Net effect for typical components:** N built-in decorators on one element produce **0 stream wrappers** (was N nested `map` streams). For a 5-decorator element across 1000 mounts: ~5000 fewer Stream-class allocations and ~5000 fewer sink-chain hops per page.
- **Custom user ops are unaffected.** Any decorator without a `__mutate` hook is treated as a stream op and wraps the I$Node stream as before. Tethers (from `behavior()`) remain stream-wrapping.
- **Direct call form preserved.** `style({...}, $node)` still works and returns the wrapped stream — same behavior as before, just no fast path.

#### `IMutator<TElement>` interface (new)

```ts
interface IMutator<TElement = unknown> {
  (source: I$Node<TElement>): I$Node<TElement>
  __mutate: (node: INode<TElement>) => INode<TElement>
}
```

The partial form of every built-in decorator returns this. `INodeCompose` accepts both `IMutator` and `I$Op` as decorator arguments. `IMutator` and the `makeMutator` helper are exported from `aelea/ui` (and re-exported from `aelea/ui-renderer-dom`); custom decorators can wrap their mutate function with `makeMutator` to opt into the fast path.

#### `INode` shape — collapsed static styles

```ts
// Before:
interface INode {
  classes: string[]                  // (transient v4 field, removed)
  style: IStyleCSS                   // accumulated static style
  stylePseudo: { class, style }[]    // accumulated pseudos
  ...
}

// After:
interface IStaticStyleEntry {
  pseudo: string | null
  style: IStyleCSS
}
interface INode {
  staticStyles: IStaticStyleEntry[]
  ...
}
```

One field instead of three. Renderers iterate it once. Per-mount work drops from "Object.assign + push to stylePseudo + (v4: push to classes)" to a single push.

#### Renderer changes

- **DOM `applyStaticStyle`** iterates `staticStyles` and resolves each entry through `createStyleRule(style, pseudo)`. Object-identity `WeakMap<style, Map<pseudo|null, className>>` short-circuits the content-key compute on warm mounts.
- **`createStyleRule(style, pseudo?)` is unified.** The separate `createStylePseudoRule` is gone — pseudo is an optional second arg. Public re-exports updated.
- **Takumi `cloneNode` / `snapshotToTakumi`** updated to read from `node.staticStyles` (filtering `pseudo === null`) instead of the removed `node.style`. The merged-style snapshot path is preserved.

### Performance — measured shape (estimated, not benchmarked)

| Scenario | 4.0 | 4.1 |
|---|---|---|
| 5 decorators on one element, mount | 5 stream wrappers + 5 sink hops + 5 Object.assign + 5 createStyleRule calls | 0 stream wrappers + 0 sink hops + 5 push + 5 createStyleRule (WeakMap-cached) |
| Reactive style emission (`styleBehavior`) | 1 Object.entries alloc + 1 new Map alloc + regex per kebab + String() always | for…in + reused scratch Map + cached kebab + typeof shortcut (carried over from 4.0) |
| Theme switch | CSS cascade re-resolution (carried over from 4.0) | CSS cascade re-resolution |

Order-of-magnitude impact: **subscribe-time speedup of ~30-50%** on decorator-heavy components, **memory pressure reduction of ~5MB per 1000 mounted nodes** (no nested stream wrappers), **reactive write paths ~2-5× faster** on hot animation-driven properties.

### Migration

#### Most code: nothing to change

Existing call sites compile and run unchanged. `style({...})($node)`, `$row(spacing.default, style({...}))`, `attr({id: 'x'})($input)` — all behave the same. The fast path is automatic for built-in decorators.

#### Custom decorators

If you have custom node-mutator ops shaped like:

```ts
const myDecorator = (source) => map(node => {
  node.styleBehavior.push(myStream)
  return node
}, source)
```

…they continue to work as stream ops (no fast path). To opt into the fast path, use the exported `makeMutator` helper:

```ts
import { makeMutator } from 'aelea/ui'

const myDecorator = makeMutator(node => {
  node.styleBehavior.push(myStream)
  return node
})
```

`makeMutator` returns an `IMutator` whose direct-call form (`myDecorator($source)`) wraps the stream the same way the old `map`-based op did, while exposing `__mutate` so `$element(...)` can apply the mutation in place.

#### Reading `node.style` / `node.stylePseudo` directly

If you have code that reads these (e.g. a custom renderer), update to iterate `node.staticStyles`:

```ts
// Before
mergeStyle(state, node.style)
for (const { class: pseudo, style } of node.stylePseudo) { … }

// After
for (const entry of node.staticStyles) {
  if (entry.pseudo === null) mergeStyle(state, entry.style)
  else handlePseudo(entry.pseudo, entry.style)
}
```

#### `createStylePseudoRule` removed

Use `createStyleRule(style, pseudo)` instead. The public API is consolidated.

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
