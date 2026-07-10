# aelea

## 4.13.2

### Patch Changes

#### `$Slider` — the first user input animates

Without `from`, the display stream fed `motion` through `merge(take(1, value), motion(cfg, skip(1, value)))`: the mount value bypassed the spring and the user's FIRST input became the spring's initialization event, which `motion` snaps by design — so the first drag/click jumped and only later inputs tweened. `motion` already renders its first event instantly and animates every one after, so the slider now feeds it the value stream directly (seeded with `from` when given). Mount still snaps; the first input animates.

## 4.13.1

### Patch Changes

#### Schedulers — disposal now cancels native timers

`scheduler.delay` on every scheduler (browser, node, DOM, headless) previously discarded the `setTimeout` handle and returned the task — disposing a delayed task only deactivated it, leaving the armed native timer alive until it fired. Each stray timer retained its task→sink subscription graph, and on Node/Bun kept the process alive (a disposed `delay(60_000)` blocked exit for a full minute). All schedulers now return a disposable that clears the underlying timer. The `delay()` combinator stores its armed handles per pending event and `periodic` keeps ownership of its re-scheduled handle, so disposal cancels in-flight timers of whichever generation is armed; `debounce` and `bufferEvents` pick the fix up automatically. High-frequency debounced streams (e.g. mousemove) no longer accumulate one live timer per event.

#### `state` / `tether` — late-subscriber replay is stale-proof

The cached-value replay task captured a snapshot of the value at subscribe time. If an emission was already queued in the scheduler when a subscriber joined, the fresh value was delivered first and the stale snapshot replayed after it — the subscriber settled on outdated data. Replay now reads the cache at flush time, so a late subscriber always ends on the latest value. A disposed tether primary's cleared cache is no longer resurrected by an already-queued replay.

#### `zip` — fresh object per emission

`zip` mutated and re-emitted a single shared result object, so every emission aliased the same reference — buffering or caching zip output showed all past emissions mutated to the latest values. Each emission is now a fresh object (matching `combine`). Ended sources' subscriptions are also disposed eagerly instead of being retained until the whole zip tears down.

#### `merge` / `combine` / `zip` — synchronous-end safety and single disposal

A source that ended synchronously inside `run()` (possible with custom `stream(sink => …)` sources) crashed `merge`/`combine` with a TypeError on an unassigned disposable slot. All three combinators now handle it, and an ended source's handle is disposed exactly once — previously an async-ended source's cleanup could run a second time on subscription teardown, breaking non-idempotent teardowns.

#### Error routing — applicative errors reach everyone

Per the stream contract, `error()` is applicative (recoverable, non-terminal). Gaps where a throw escaped that model are closed: `combine`'s mapping callback now routes throws to `sink.error` (matching `map`/`filter`/`zip`) instead of unwinding the emitting source's stack; multicast error delivery reaches every subscriber even if one handler throws (the first failure rethrows after the loop); `fromPromise` and `promiseState` route downstream throws to `sink.error` instead of losing them as unhandled promise rejections, and always deliver `end`; `sample` disposes its values subscription exactly once.

## 4.13.0

### Minor Changes

#### `$Slider` — `from?: number` for deterministic mount animation

`$Slider` previously decided whether to animate its initial value based on the *timing* of the value stream's emissions: it snapped to the first emission (`take(1)`) and only spring-animated subsequent ones (`skip(1)`). Whether the thumb animated to its initial value was therefore an accident of upstream async ordering — a slider fed by a `combine(...)` gated on a late fetch would have its leading rest value coalesced away and snap, while the same logical value emitted as a single event would also snap, and only a value stream that happened to lead with a rest value would animate.

The new `from?: number` config makes the entrance animation an explicit, declared intent:

```ts
$Slider({ value: just(0.6), from: 0 })   // thumb renders at 0, springs to 0.6 on mount — always
$Slider({ value: just(0.6) })            // snaps to 0.6 (unchanged default behavior)
```

When `from` is set, `displayValue` becomes `motion(motionCfg, merge(just(from), valueShared))`. The motion sink receives `from` as its first event (snaps there) and the first real value second (springs `from → value`), independent of how or when the value stream emits. This ordering is guaranteed: `merge` subscribes `just(from)` before `valueShared`, both schedule through the scheduler's FIFO asap queue, and `state` never replays synchronously during subscription — so `from` always lands first.

`from` is visual-only: it drives the thumb position and fill width, never the native `<input>`'s `value` (which stays bound to the real value, so user-drag remains in sync). It has no effect when `motion: false` (there is no animation engine to spring from). Backward compatible — omitting `from` reproduces prior behavior exactly.

Precondition: `from` must be a finite number. Passing `NaN`/`Infinity` makes the spring never settle (a general property of the motion combinator with non-finite targets), so derive it from a checked source.

## 4.12.0

### Patch Changes

#### `disabledOp` — `disabled: false` now clears the attribute

`disabledOp` emitted a boolean `disabled` attribute, so an enabled state rendered as `disabled="false"`. Because `disabled` is an HTML *boolean* attribute (presence disables, value ignored), any control fed a `disabled` stream that emitted `false` stayed silently disabled. It now emits `''` when disabled and `null` when enabled (the "emit `null` to clear" convention), so the attribute is removed on `false`. Affects every controller using `disabledOp` (`$Button`, `$ButtonIcon`, `$Slider`, …) with a reactive `disabled` stream.

#### Reactive core — behavior/tether teardown leak

`behavior()` output subscriptions (including `nodeEvent` listeners wired through a component's output tethers) were not disposed on unsubscribe — `disposeAll(...)` was called without invoking its returned disposable. Component unmount now tears them down.

### Minor Changes

#### Takumi renderer — `ResolvedNode` pipeline + deterministic settle

The server-side image renderer (`aelea/takumi`) materializes a tree once into a plain, renderer-agnostic `ResolvedNode`, then projects that to takumi nodes, with a live `observeManifest` observer and a deterministic `createSettleScheduler` (settles on the scheduler's `idle()` signal — microtask-scale, no fixed delay). New exports: `observeManifest`, `ResolvedNode`, `IManifestObserver`, `createSettleScheduler`, `ISettleScheduler`.

**Breaking (low-level only):** `snapshotToTakumi` and `snapshotStream` now operate on `ResolvedNode` instead of `INode`. `renderToImage` is unchanged. `rendererOptions` is typed `Record<string, unknown>` (the installed `@takumi-rs/core` ≥ 1.6 no longer surfaces its option interfaces under NodeNext); supported `@takumi-rs/core` is now ≥ 1.6.

#### Performance

`merge` / `combine` reach `@most/core` parity — dedicated inner sinks drop the per-event `IndexSink` indirection. The DOM renderer's mount path is materially faster on large lists (~+35% on 1000 rows: a build-time node plan with no per-mount wrapper allocation, and O(n) slot insertion replacing the O(n²) index scan). Reactive style application is leaner (lazy single-map diff + reference short-circuit). Scheduler flushes share one timestamp per flush across all schedulers.

## 4.11.1

### Patch Changes

#### `$Popover` — tighter default `backdropBleed`

Default `backdropBleed` reduced from `8` → `6`. The cutout hugs the anchor a touch closer. Override via `backdropBleed: N` if you want more breathing room.

## 4.11.0

### Minor Changes

#### `$Popover` — configurable backdrop bleed

The cutout's clear margin past the anchor (previously a hardcoded 16px) is now a `backdropBleed?: number` config (default `8` — tighter hug than 4.10.0's hardcoded value). Controls how much breathing room the anchor gets inside the transparent rounded rectangle before the dim color begins.

```ts
$Popover({ $open, $target, backdropBleed: 0 })   // cutout exactly hugs the anchor
$Popover({ $open, $target, backdropBleed: 32 })  // generous padding around the anchor
```

Pairs with `backdropBorderRadius` from 4.10.0 — together they define the cutout's geometry. The default drop from 16 → 8 is a small visual change: popovers opened against existing anchors will show the dim closer to the anchor edge unless `backdropBleed: 16` is passed.

## 4.10.0

### Minor Changes

#### `$Popover` backdrop — rectangle cutout with configurable border-radius (breaking)

The backdrop reveal is now a hard-edged rounded rectangle sized to the anchor, replacing the radial-gradient ellipse from 4.9.x. The visual is produced by an inner `<div>` positioned at the anchor's bounding rect (plus a 16px bleed) with `border-radius` + a `box-shadow: 0 0 0 9999px ${dim}` spread — the shadow paints the dim color *outside* the rounded rectangle, the rectangle itself stays transparent. The outer viewport-spanning `<div>` keeps its job of capturing dismiss clicks; the inner has `pointer-events: none` so clicks on the cutout area still bubble up to the outer's handler.

`anchorRect` is computed once per open and shared via `state()` — the outer's opacity fade-in and the inner's geometry both subscribe to the same source.

**Breaking:** `I$Popover.backdropFeather` is removed. Replace with `backdropBorderRadius?: number` (default `12`).

```ts
// before (4.9.x)
$Popover({ $open, $target, backdropFeather: 60 })

// after (4.10.0)
$Popover({ $open, $target, backdropBorderRadius: 12 })   // gentle rounded corners
$Popover({ $open, $target, backdropBorderRadius: 0 })    // sharp rectangle
$Popover({ $open, $target, backdropBorderRadius: 9999 }) // pill / full-round
```

The reveal now has a hard edge instead of a soft feather. If you want a softer halo back, the older radial-gradient approach is recoverable by overriding the backdrop shape via the (existing) `$container` slot — but the default is the cleaner rectangular cutout that matches typical anchor geometry.

## 4.9.1

### Patch Changes

#### `$Popover` backdrop — theme-tinted dim

The backdrop dim is back to `color-mix(in srgb, ${palette.horizon} 85%, transparent)` (reverting the `rgba(0, 0, 0, 0.6)` from 4.9.0). The reveal now reads clearly even with the theme-tinted dim because it's the *radial gradient feather* (not the dim color's alpha) that does the visual focus work — the spotlight emerges from a transparent anchor area into a 85%-horizon backdrop over `backdropFeather` pixels.

This keeps the backdrop in palette across themes — picking up whatever `palette.horizon` resolves to — instead of always being pure black.

## 4.9.0

### Minor Changes

#### `$Popover` backdrop — spotlight reveal around the anchor

The popover backdrop previously cut a hard rectangular hole around the anchor using `clipPath: polygon(...)` — a sharp edge between the dim layer and the anchor area. It now uses a `radial-gradient` ellipse centered on the anchor: fully transparent through the anchor + a 16px bleed, feathered to dim over `backdropFeather` pixels, fully dim beyond. The ellipse radii follow the anchor's `width / 2` and `height / 2`, so the clear region matches the anchor's silhouette — wide buttons get a wide oval, tall anchors get a tall oval.

The dim color is now `rgba(0, 0, 0, 0.6)` (was `color-mix(in srgb, palette.horizon 85%, transparent)`). In dark themes `palette.horizon` blends with the page background and produces no visible darkening; pure-black alpha works in any theme.

```ts
$Popover({ $open, $target, backdropFeather: 60 })   // default — soft halo
$Popover({ $open, $target, backdropFeather: 4 })    // tight, near-sharp edge
$Popover({ $open, $target, backdropFeather: 160 })  // very wide diffuse focus
```

The `clipPath` polygon and the base `backgroundColor` on the backdrop `$node` are both gone; the gradient (in `styleInline`) carries both the dim color and the reveal shape, repositioning on the same `scroll + resize + animationFrame` reposition stream.

### New API

- `I$Popover.backdropFeather?: number` — controls the radial gradient's falloff width in pixels (default `60`). Larger values produce a softer, wider halo; smaller values produce a sharper edge. Named to disambiguate from CSS `backdrop-filter: blur(...)` — this is a gradient feather, not a Gaussian blur.

## 4.8.0

### Minor Changes

#### `$Popover` enter animation — snap-style ease

`$Popover` now animates on open: backdrop fades in (opacity `0 → 1`) and the content panel fades + scales (`opacity 0 → 1`, `scale(0.96) → scale(1)`). Both transitions run for 220ms on `cubic-bezier(0.22, 1, 0.36, 1)` (easeOutQuint) — a CSS approximation of the overdamped `MOTION_SNAP` spring (stiffness 800, damping 80, damping ratio ≈1.4): fast initial movement, long slow tail, no overshoot.

`transformOrigin` follows the flip direction — `center top` when the popover opens downward, `center bottom` when it flips up — so the scale always grows out of the anchor edge, not from the panel's geometric center.

Two side fixes that fell out of switching from `translate(0, -100%)` to a true `scale()`:

- Up-flip top position changed from `aRect.top - spacing` to `aRect.top - spacing - cRect.height`. The previous form relied on the `-100%` translate to undo its own offset; with translate gone, the explicit height subtraction is what places the panel above the anchor.
- The legacy `translate(0, -100%)` y-axis hack is gone. Positioning is fully resolved through `top`/`left` + `transform: scale(1)`.

#### `Input.validation` is now `IStream<string | null>` (breaking)

`Input.validation` (the shared shape used by `$Input`, `$TextField`, and `$FormField`) changed from `IOps<T, string | null>` to `IStream<string | null>`:

```ts
// before
interface Input<T> { validation?: IOps<T, string | null> }

// after
interface Input<T> { validation?: IStream<string | null> }
```

Previously the controller owned the wiring: it piped the input's `change` stream through your operator, sampled the result at `blur`, and multicast it. Callers passed a *function* and the controller decided *when* it ran. Now callers pass a *stream* and own the timing.

Migration: build the validation stream yourself with whatever source and gating you want, then pass it in.

```ts
// before — controller owned change + blur sampling
$TextField({ validation: src => map(validateEmail, src) })

// after — caller owns the full pipeline
const change = state('')
const blur  = state<FocusEvent | null>(null)
const validation = op(
  combine({ value: change, _: blur }),
  map(({ value }) => validateEmail(value))
)
$TextField({ validation })({ change: changeTether(), blur: blurTether() })
```

This unlocks validation sources that aren't tied to the input's own change stream — form-level cross-field rules, async/server validation, validation that fires on submit rather than on blur — without the controller having to grow a configuration knob for each case.

`$Input`'s `validation` default also changed from `constant(null)` to `never`: no more spurious initial `null` emission for callers who never set validation.

#### `$TextField` exposes `blur` in its output

`$TextField`'s component output is now `{ change, blur }` instead of `{ change }`. The `blur` behavior was already tethered internally; it's just returned now so consumers can gate validation (or anything else) on blur from outside the component. Required for the validation migration above, since the controller no longer samples blur on the caller's behalf.

#### `$FormField` gains a `disabled` prop

`I$FormField` now extends `Control` and accepts `disabled?: IStream<DisabledState>`. When disabled, the form field container tints to `colorWeight(palette.foreground, 30)` with `cursor: not-allowed`, covering the label and message slots. The inner `$control` is still responsible for its own disabled behavior — the field-level prop is purely visual scaffolding around it.

`$TextField` was updated to use the same field-level tint instead of delegating to the inner input's `disabledStyleOp`, so the label row dims along with the input.

### Patch Changes

#### Controllers: shared state migrated from `multicast` to `state()`

`$Checkbox`, `$Slider`, `$Input`, `$TextField`, `$FormField` were rewritten to share derived streams (`disabled`, `value`, validation/message state) through `state()` instead of `multicast()`. `multicast` has no replay — subscribers that attach after the source has emitted wait for the next event. `state()` replays the most recent value to late subscribers, which matches what these controllers actually need: every internal consumer (border styles, cursor styles, attribute behaviors) attaches at component-mount time and expects the current value immediately.

Pipelines were also rewritten from the legacy `o(...operators)` + apply form to `op(source, ...operators)`, which reads top-to-bottom and avoids the partially-applied combinator dance.

No public API change beyond what's listed above — purely an internal correctness/readability pass.

#### `$Slider`: `color` is now optional and derives from disabled state when omitted

`$Slider.color` was a required-with-default (`just(colorWeight(palette.foreground, 50))`); it's now optional, and when omitted the fill color tracks the disabled state — `foreground 30` when disabled, `foreground 50` otherwise. Existing callers that pass `color` explicitly are unaffected. Callers that relied on the previous default get an additional disabled-aware behavior for free.

## 4.7.2

### Patch Changes

#### `$Popover` no longer clips off-screen on edge-anchored or top-of-viewport positioning

Two positioning bugs in the content placement of `$Popover`:

**Horizontal — content cut off near viewport edges.** The previous logic was `left: clamp(spacing, centerX, 100vw - spacing)` + `transform: translate(-50%, …)`. The clamp constrained the *center point* of the popover, not its edges; the `translate(-50%)` then shoved half the content past the viewport edge whenever the anchor sat near a screen border. With a wide popover and a left-aligned anchor, half the content ended up clipped off the left side.

Now we measure `cEl.getBoundingClientRect().width`, compute the *desired left edge* (`centerX − width/2`), and clamp that to `[spacing, viewportWidth − width − spacing]`. Horizontal `translate(-50%)` is dropped — the final left edge is resolved directly. Anchor centered → content visually centered (same as before). Anchor near an edge → content slides inward and sits flush against `spacing`px from the viewport edge. The content container's own `maxWidth: 'calc(100vw - 20px)'` keeps the clamp range non-degenerate when `spacing ≤ 10`.

**Vertical — magic-number bias against flipping up.** The previous rule was `goDown = bottomSpace > 200 || bottomSpace > aRect.top`. The `> 200` threshold biased toward "go down" whenever the space below was at least 200px, **even when the space above was larger**. Anchors near the top of the viewport with limited room below kept going down and overflowing, instead of correctly flipping up.

Now: `spaceBelow = innerHeight − aRect.bottom`; `spaceAbove = aRect.top`; `goDown = spaceBelow >= spaceAbove`. Pick the side with more room; ties prefer down. No magic threshold.

Combined, the popover stays inside the viewport in every position — anchored to corners, edges, top, bottom, or center. The repositioning runs every animation frame (via the existing `animationFrame()` merge), so the clamps stay correct as the anchor moves through CSS transitions, scroll, or parent motion.

## 4.7.1

### Patch Changes

#### `MotionSink.[Symbol.dispose]` recursion fix

The 4.7.0 motion-dispose override had a self-recursion bug. The scheduler's `delay(task, ms)` returns `task` itself (not a wrapper — see `BrowserScheduler.delay`), so for `MotionSink` — which schedules itself via `scheduler.delay(this, …)` — `this.pendingTask === this`. The override called `this.pendingTask[Symbol.dispose]()` which dispatched right back into `MotionSink[Symbol.dispose]`, where `pendingTask` was still set, looping forever.

Fixed with the standard null-before-dispose pattern (same one `continueWith.ts` already uses): capture the task into a local, null the field first, then dispose. The recursive entry sees `this.pendingTask === null`, hits the guard, and exits.

```ts
[Symbol.dispose](): void {
  this.active = false
  if (this.pendingTask) {
    const t = this.pendingTask
    this.pendingTask = null
    t[Symbol.dispose]()
  }
}
```

Audited every other site that stores a `Disposable` it later disposes (`continueWith`, `switchLatest`, `join`, `multicast`, `debounce`, `delay`, `buffer`, `awaitPromises`, `periodic`) — none have the same recursion class. `motion.ts` was the only sink that both schedules itself (`scheduler.delay(this, …)`) **and** has a custom `[Symbol.dispose]` that re-disposes its stored task field. `periodic.ts` schedules itself too but discards the reschedule's return value, relying on the inherited `active` gate, which is incidentally safe given the scheduler's "return task as the Disposable" convention.

## 4.7.0

### Minor Changes

#### `I$Name` config-type convention (breaking for typed imports of six names)

A component's props/config interface is now named `I$Name` to match its `$Name` function — `$Button(props: I$Button)`, `$Dropdown<T>(props: I$Dropdown<T>)`. Precedent: `I$IntermediatePromise` was already in this shape. The `$` ties the type to the `$function` it configures so the pair reads as one symbol with two halves.

Public type renames (consumers importing these by name must update; mechanical find/replace):

| Old (4.6.0) | New (4.7.0) |
|---|---|
| `IButton` | `I$Button` |
| `IDropdown<T>` | `I$Dropdown<T>` |
| `IButtonToggle<T>` | `I$ButtonToggle<T>` |
| `IFormField` | `I$FormField` |
| `ITooltip` | `I$Tooltip` |
| `IQuantumScroll` | `I$QuantumScroll` |
| `IAnchor` | `I$Link` (matches `$Link`) |

Also renamed internally + now publicly re-exported from `aelea/ui-components` (previously not on the barrel — additive only): `I$ButtonIcon` (was `IButtonIcon`), `I$Checkbox` (was `Checkbox`), `I$Input` (was `IInput`), `I$Slider` (was `ISliderParams`), `I$TextField` (was `TextField`), `I$Popover` (was un-exported `IPopover`), `I$NumberTicker` (was `NumberConfig`), `I$Tabs` (was `Tabs`), `I$Icon` (was un-exported `Icon`). The `Tab` data type (a single tab item, not the `$Tabs` props) stays as-is.

Out of scope (kept as-is): `Control`, `Input<T>`, `DisabledState`, `IPageRequest`, `IQuantumScrollPage`, `TablePageResponse`, `ISortBy`, `TableOption`, `TableColumn`, `Tab`, `Route`, `RouteSpec`, `RouteNode`, `Fragment`, `Path` — these are data/option/base types, not the props of a `$function`.

#### `switchPromises` — named latest-wins promise-stream flatten

```ts
export const switchPromises = <T>(source: IStream<Promise<T>>): IStream<T> =>
  switchLatest(map(fromPromise, source))
```

Equivalent to `switchMap(p => p, src)`; named for discoverability of the "I already have `IStream<Promise<T>>`, flatten latest-wins" case. Disposes the prior `fromPromise` inner on each new emission, so stale settles are dropped — the opposite of `awaitPromises` (FIFO). Companion to the existing `switchMap(async x => fetch(x))` for the "have a value, want to fetch latest" case.

Exported from `aelea/stream`.

#### `MOTION_SNAP` preset + `$Slider` default flipped

New preset in `aelea/ui`:

```ts
export const MOTION_SNAP = { stiffness: 800, damping: 80, precision: 0.01 }
```

Strong t=0 kick (`acceleration = stiffness · distance`) with an overdamped settle (ratio ≈ 1.4) — no overshoot, pronounced eased tail. `$Slider`'s `motion` default changed from `MOTION_NO_WOBBLE` (170/26, critically damped) to `MOTION_SNAP`. Consumers wanting the prior feel pass `motion: MOTION_NO_WOBBLE` explicitly, or `motion: false` to disable.

Damping ceiling note: the integrator treats damping explicitly with `dt = 1/60`, so stability needs `damping · dt < 2` → `damping < 120`. `MOTION_SNAP` at 80 uses ~67% of the headroom. Configs with `damping ≳ 120` would diverge.

### Patch Changes

#### `MotionSink.[Symbol.dispose]` cancels the in-flight frame eagerly

`MotionSink` extended `PropagateTask`, whose `[Symbol.dispose]` sets `active = false`. Behaviorally that already prevents the scheduled frame from running new work, but the scheduler held a pending timer for up to ~16ms post-dispose. The override now also calls `this.pendingTask?.[Symbol.dispose]()` so the timer cancels immediately. No semantic change (the `active` gate was always correct); just zero trailing dead timers.

#### `$icon` — `size` shorthand, reactive `fill`, corrected `viewBox` default

```ts
$icon({ $content: $trash, size: '20px' })                 // sets width + height
$icon({ $content: $trash, width: '24px' })                // height falls through to aspectRatio: '1 / 1'
$icon({ $content: $trash, fill: colorStream })            // reactive fill via styleBehavior
$icon({ $content: $trash, fill: palette.message })        // literal fill via style
```

`size?: string` shorthand sets both width and height. When no `size` and no `height`, `aspectRatio: '1 / 1'` keeps the SVG square as it scales. `fill` accepts `string | IStream<string>` — streams go through `styleBehavior(map(f => ({ fill: f }), …))`, literals through static `style({ fill })`. The previous `viewBox` default was derived from `parseInt(width)`/`parseInt(height)` which conflated CSS-length units (e.g. `"24px"`) with SVG viewBox coordinates; replaced with a fixed `'0 0 32 32'`. The previous `svgOps = op` default was the `op` function reference itself (a latent bug; the `()` invocation was missing); now correctly `svgOps = o()` (empty composition). Type now exported as `I$Icon`.

#### `aelea/ui-components` barrel broadened

Now also re-exports `disabledStyleOp`, `resolveDisabledState`, `isDisabled`, `DisabledState` from `controllers/form.ts` (previously only `disabledOp` / `dismissOp` / `focusOutlineOp` / `interactionOp` were public). The 4.6.0 `disabled` convention referenced `disabledStyleOp` as a usable helper but didn't expose it — that gap is fixed. Several per-component config types not previously on the barrel are now public too (see the rename table above) — additive only.

### Minor Changes

#### Folder rename: `components/form/` → `components/controllers/`

The form-element directory was renamed to `controllers/`. `$Dropdown` (previously at `components/$Dropdown.ts`) also moved into `components/controllers/`. Public exports via `aelea/ui-components` are unchanged — only deep relative imports break. None of these paths are exposed via the package's `exports` field, so this is internal-only for typical consumers.

#### `$FormField` — label-rooted wrapper with parent-owned validation/hint slot

New form primitive at `aelea/ui-components`. The `<label>` is the root so clicks anywhere on the field (label text, control, message row) focus the inner control via the browser's default label-association behavior. Three reserved slots:

```ts
$FormField({
  $control: $Input({ value }),
  label: 'Email',                             // string or IStream<string>
  validation: validationStream,               // IStream<string | null>
  hint: hintStream                            // IStream<string>
})
```

- `validation` (truthy) renders in `palette.negative`; falsy falls through to `hint` (rendered in `palette.foreground`); both empty renders an invisible row.
- The message row reserves `min-height: 1.25rem` so layout doesn't jump as `validation` toggles.
- Validation logic stays at the call site — `$FormField` only renders. Parent computes `IStream<string | null>` via whatever rules it owns and passes it down.

Exports: `$FormField`, `$defaultFormFieldContainer`, `$defaultFormFieldLabel`, `$defaultFormFieldMessage`, and `IFormField` type.

Doesn't conflict with `$Input.validation` (which is a `IOps<T, string | null>` validator that drives the inline border-color tint). Consumers can use both: `$Input.validation` for the on-change border tint, `$FormField.validation` for the message row below.

#### `Control.disabled` widened to `IStream<boolean | Promise<unknown>>`

Previously every "submit a transaction" / "submit a form" call site wrapped `$Button` just to disable-while-busy. A `pending?: IStream<Promise<unknown>>` parallel prop was considered but rejected — splits state across two props that mean the same thing ("this control is currently blocked from input").

Collapsed to a single richer prop. `Control.disabled` now accepts either a `boolean` (explicit) or a `Promise<unknown>` (block while in-flight). The widening cascades to every component extending `Control` (`$Button`, `$ButtonIcon`, `$Slider`, `$Checkbox`, `$Input`, `$TextField`).

```ts
$Button({ $content: $text('Save'), disabled: isInvalid })          // boolean
$Button({ $content: $text('Submit'), disabled: txQuery })          // IStream<Promise<TxReceipt>>
$Slider({ value, disabled: isComputing })                          // same shape, all primitives
```

Implementation hoisted to shared helpers in `form.ts`:

```ts
export type DisabledState = boolean | PromiseState<unknown>
export const resolveDisabledState: (s: IStream<boolean | Promise<unknown>>) => IStream<DisabledState>
export const isDisabled: (s: DisabledState) => boolean
```

`disabledOp` now consumes the wider type, internally `switchMap`s `Promise → promiseState`, and renders the differentiated state:

- Boolean-disabled (`true`) → `opacity: 0.4` + `cursor: not-allowed` + `pointer-events: none` + `disabled` attr.
- Promise-pending → `cursor: wait` + `pointer-events: none` + `disabled` attr (no dim — control looks "busy", not "off").
- Promise settled (DONE or ERROR) → re-enables; the resolved value is ignored, only `PromiseStatus` is read.

`$Button` now uses `disabledOp(disabled)` directly (no inline mutator) and continues to extend `Control`. `$ButtonIcon` is unchanged at the source level (transparently benefits via `disabledOp`). `$Slider` was refactored to derive `state` / `isDisabledStream` / `cursorStream` via `multicast(resolveDisabledState(disabled))` at the top of its body, threaded through the existing `combine`/`styleBehavior`/`effectProp` uses — the same dual-cursor visual (`wait` for pending, `not-allowed` for boolean-disabled) carries over to the slider's container and native input overlay. `$Slider`'s previous local `disabled?: IStream<boolean>` redeclaration was removed so it inherits the widened type from `Control`.

`$Checkbox`, `$Input`, and `$TextField` are now also wired up:
- `$Input` applies `disabledOp(disabled)` to its native input (the visible root — dim + cursor + attr all land on the same element).
- `$Checkbox` applies `disabledStyleOp(disabled)` to the outer surface (label container when label present, box otherwise) so `pointer-events: none` cascades through the entire field and the hover/focus interaction tethers can't fire while disabled. `effectProp('disabled', isDisabledStream)` lands the attribute on the invisible native input. The box's focus-border styleBehavior is gated by `combine({ active, d: isDisabledStream })` so the primary-color hover ring doesn't persist if disable kicks in while the cursor is over the field.
- `$TextField` applies `disabledStyleOp(config.disabled ?? never)` to the label container so label text + hint + the inner `$Input` all dim together.

A new export `disabledStyleOp` (visual-only sibling of `disabledOp`, no `disabled` attribute push) was added to `controllers/form.ts` for cases like `$Checkbox` where the disabled-attribute target differs from the visual target.

#### `$Popover` — `disabled` prop, force-close on disable

`$Popover` now extends `Control`. `disabledOp(disabled)` is applied to the outer `$container`, which holds the anchor, backdrop, and content — `pointer-events: none` cascades through all three, so opening the popover by clicking the anchor is blocked while disabled.

The `dismissEvent` stream now also merges `filter(d => d, isDisabledStream)`, so if the popover is already open when disable transitions to `true`, it auto-closes. The resolved value of the promise (if `disabled` is a promise) is ignored — only `PromiseStatus.PENDING` matters.

#### `$ButtonToggle` (new) — semantic buttons + a11y attributes

Segmented-control primitive — a horizontal row of buttons where the currently-selected option is visually inset:

```ts
$ButtonToggle({
  optionList: ['A', 'B', 'C'],
  value: selectedStream,
  $$option: map(opt => $text(opt))            // optional renderer
})
```

- `$defaultButtonToggleBtn` is `<button type="button">` (not `<row>`) — proper keyboard focus + `:focus-visible` semantics + screen-reader announcement.
- `attrBehavior` per button writes `aria-pressed="true|false"` from `value === opt`, so screen readers announce the active option.
- `$defaultButtonToggleContainer` sets `role="group"`.
- Accepts `disabled` via `Control` inheritance; `disabledOp(disabled)` is applied to the container.

Selected option visual: `boxShadow: 0px 0px 0 1px ${palette.primary} inset` + `pointer-events: none` (re-clicking the active item is a no-op). Other options render in `palette.foreground`. Exports: `$ButtonToggle`, `$defaultButtonToggleBtn`, `$defaultButtonToggleContainer`, `IButtonToggle<T>`.

Plugs into the same state-as-prop pattern used elsewhere: parent owns `value: IStream<T>`, child emits `select: IStream<T>`. Parent merges `select` into its own store to drive the next `value`.

#### `Control` is the canonical source of `disabled` across all primitives

`IButton`, `IButtonIcon`, `IButtonToggle<T>`, `ISliderParams`, `Checkbox`, `IInput`, `TextField`, `IDropdown<T>`, and `IPopover` all inherit `disabled?: IStream<boolean | Promise<unknown>>` from `Control`. No component carries an ad-hoc local declaration anymore. Adding new disable-able primitives is a one-line `extends Control`.

#### `$Dropdown` — `disabled` prop + `<button>` anchor

`$Dropdown` now accepts `disabled?: IStream<boolean | Promise<unknown>>` (same shape as the rest). `$defaultDropdownAnchor` switched from `$row` (a `<row>` custom element) to a `<button type="button">` so the `disabled` attribute and `:focus-visible` semantics are correct for keyboard accessibility and screen readers. `disabledOp(disabled)` is applied to the dropdown container — blocks pointer events (which kills the open-menu click handler) and dims the anchor. The `disabled` attribute lands on the container `<div>`, which is HTML-meaningless but inert.

Consumers that pass a custom `$anchor` are responsible for their own a11y semantics; the container-level pointer-events block still prevents the menu from opening either way.

#### `$ButtonToggle` (new)

Segmented-control primitive — a horizontal row of buttons where the currently-selected option is visually inset:

```ts
$ButtonToggle({
  optionList: ['A', 'B', 'C'],
  value: selectedStream,
  $$option: map(opt => $text(opt))            // optional renderer
})
```

Selected option gets `boxShadow: 0px 0px 0 1px ${palette.primary} inset` + `pointer-events: none` (re-clicking the active item is a no-op); other options render in `palette.foreground`. Exports: `$ButtonToggle`, `$defaultButtonToggleBtn`, `$defaultButtonToggleContainer`, `IButtonToggle<T>`.

Plugs into the same state-as-prop pattern used elsewhere: parent owns `value: IStream<T>`, child emits `select: IStream<T>`. Parent merges `select` into its own store to drive the next `value`.

#### `palette.interaction` tokens + applied across button/dropdown defaults

New theme entry alongside `palette` and `text`:

```ts
import { interaction } from 'aelea/ui-components-theme'

interaction.hoverFilter   // 'var(--interaction-hover-filter, brightness(1.1))'
interaction.activeFilter  // 'var(--interaction-active-filter, brightness(0.9))'
```

Single source of truth for hover / active visual feedback. CSS-var fallback means apps without overrides still get sensible defaults; apps that want per-theme tuning can define `--interaction-hover-filter` / `--interaction-active-filter` in their theme stylesheets.

Applied as `:hover` / `:active` filter pseudos on `$defaultButtonContainer`, `$defaultButtonIconContainer`, and `$defaultDropdownAnchor`. Skipped where existing visual feedback already covered it (`$Anchor` color shift, `$Checkbox` focus outline, `$Dropdown` option-row `:hover` background), where hover can't fire (`$Slider` thumb has `pointer-events: none` from the native input overlay), or where there's no built-in style to extend (`$Tabs`, `$Input`).

Transition-timing tokens were considered and rejected — animation belongs in the `motion()` combinator at the JS layer, not in a CSS transition string.

### Patch Changes

#### `$defaultAnchor` no longer fades its hover color transition

Removed `transition: 'color 120ms ease-out'` from `$defaultAnchor`'s default style. Hover color now snaps instantly. Consumers that wanted the fade can compose it back via their own `$anchor` override.

#### `state(I, source)` type uses `NonNullable<unknown>` instead of `{}`

The strict typing introduced in 4.5.2 (`<I extends {} | null, T>`) used `{}` as the "any non-undefined value" idiom, which biome flags as `noBannedTypes`. Replaced with `NonNullable<unknown> | null` — identical semantics, doesn't trip the lint rule lexically.

#### Biome formatter sweep on `$Slider.ts`

`$Slider.ts` shipped in 4.5.5 with import-ordering and formatter mismatches. Auto-fixed.

## 4.5.5

### Minor Changes

#### `$Slider` renders the state props it already accepts

`$Slider` previously accepted `disabled: IStream<boolean>` and wired it to the underlying `<input>` (correct keyboard/pointer behavior), but left the visual treatment to the consumer. Every consumer ended up overriding `$thumb` and `trackColor` just to render the disabled state the component already knows about. Same inverted dependency direction — component owns the prop, consumer owns the look.

This release flips the responsibility: when `$Slider` accepts a state stream, it renders that state by default. Custom `$thumb` overrides keep working — consumers that want a fully custom visual still own it.

##### `motion?: Partial<MotionConfig> | false` (default `MOTION_NO_WOBBLE`)

Spring physics on the thumb position is now built in with **snap-first** semantics: the first emission of `value` lands instantly, subsequent emissions spring from current position to new target. This fixes the long-standing "thumb animates from 0 to the initial position on mount" bug — `value` typically emits a placeholder before upstream sources resolve, and naive `motion(config, value)` would treat the placeholder as the initial position and animate away from it.

Pass `motion: false` to opt out and snap on every emission. Pass a partial config (`{ stiffness: 200 }` etc.) to tune.

```ts
$Slider({ value })                        // default MOTION_NO_WOBBLE spring
$Slider({ value, motion: MOTION_STIFF })  // tighter spring
$Slider({ value, motion: false })         // no animation
```

Motion applies only to the thumb position computation; the native `<input>`'s `value` attribute still receives the raw stream so drag events don't get a feedback loop through the spring.

##### `error?: IStream<boolean>` (new, default `just(false)`)

Drives a `palette.negative` tint on the default thumb's border. Forms can hand `$Slider` their existing per-field validation stream directly instead of wrapping the component.

##### Default thumb now state-aware

When `$thumb` isn't provided, `$Slider` uses an internal default that reads `disabled` + `error`:
- Idle: existing look (`palette.background` fill, `colorWeight(palette.foreground, 50)` border)
- Disabled: transparent fill, muted border (`colorWeight(palette.foreground, 25)`)
- Error: border switches to `palette.negative`

Exported `$defaultSliderThumb` const is unchanged — still a basic non-state-aware starter for consumers composing their own thumb.

##### Default `trackColor` reacts to `disabled`

`trackColor`'s default switches between `colorWeight(palette.foreground, 40)` (normal) and `colorWeight(palette.foreground, 20)` (disabled). Explicit `trackColor` override still wins.

##### Native input + container `cursor: not-allowed` when disabled

The native `<input>` overlay's cursor and the `$container`'s cursor both react to `disabled` so the disabled state reads correctly during hover.

##### Exports

`MotionConfig` is now exported from `aelea/ui` (was previously an unexported interface inside `motion.ts`).

##### Migration

If your app wraps `$Slider`'s value with `motion(config, value)` (or the `merge(take(1), motion(config, skip(1)))` snap-first dance), drop the wrapping and pass `value` raw. Pass `motion: false` if you want the prior no-animation behavior.

If you override `$thumb` to render `disabled` / `error` visuals manually, your override still works unchanged. If you only wrapped `$thumb` to react to `disabled`, you can drop the override and let the default render it.

## 4.5.4

### Patch Changes

#### Shadow color is now theme-invariant — new `palette.shadow` token

`$Popover`, `$Dropdown`, and `$Tooltip` derived their `boxShadow` color from `colorWeight(palette.background, …)` and `colorWeight(palette.message, …)`, which couples shadow polarity to theme polarity. The result:

- **`$Popover`** rendered a near-white halo in light theme (background ≈ white, weighted toward `--shade-pole = white` → fully white) — the shadow disappeared into the surface or read as a glow ring.
- **`$Dropdown` / `$Tooltip`** had the opposite bug — fine in light, washed out in dark — because `palette.message` is the inverse of `palette.background`.

Shadows simulate cast-light occlusion and should stay dark with alpha regardless of theme. Introduced a dedicated `palette.shadow` token:

```ts
palette.shadow // 'var(--shadow, rgba(0, 0, 0, 0.25))'
```

The CSS-var fallback (`rgba(0, 0, 0, 0.25)`) means apps that don't define `--shadow` per theme still get a sensible theme-invariant value. Apps that want per-theme tuning can define `--shadow` in their theme stylesheets the same way they already define `--foreground`, `--background`, `--shade-pole`, etc.

The new field is exposed via the `Effect` type group (`shadow?: string`) and intersected into `Palette`. Field is **optional** — existing app-side `Theme` records that don't set `shadow` keep typechecking, and aelea's runtime `palette` const always carries the var reference regardless of what apps pass to `writeTheme`.

Migration: nothing required. Apps that want darker/lighter shadows than the default can set `--shadow: rgba(0, 0, 0, 0.4)` (or any literal) in their theme stylesheet. Consumers that previously copied the buggy `colorWeight(palette.background, 50)` / `colorWeight(palette.message, 14)` patterns into their own containers can switch to `palette.shadow`.

## 4.5.3

### Patch Changes

#### Disposal race in `continueWith`, `switchLatest`, and `join` (incl. `joinMap`, `joinConcurrentlyMap`, `joinMapConcurrently`, `recover`)

Three sinks that subscribe new streams inside their `event` / `end` handlers were missing a hard "disposed" guard. When an upstream source emitted multiple sink calls in one synchronous frame (the canonical case is `fromPromise`, which calls `sink.event` immediately followed by `sink.end` — but any `just` / `at` / multi-event sync source qualifies) and a downstream `take(n)` / manual dispose / `until` synchronously disposed the chain from inside the first call, the *next* sink call would still execute and spawn fresh work into an already-disposed sink chain. The work had no reachable disposable, so it leaked.

The worst case was `continueWith` — and by extension `recover` and any self-referential periodic combinator (`periodicRun`-style) built on it: the new iteration's `continueWith.end` would spawn yet another iteration, recursing indefinitely. `take(1)` on a recovering polling stream leaked an undisposed polling loop per subscription.

Fix: each affected sink now carries a `disposed = false` flag set in `[Symbol.dispose]()` and early-returns from `event` / `end` when set. `[Symbol.dispose]` is also idempotent (early-returns if already disposed) to keep double-dispose paths cheap. No behavior change for the well-behaved subscribe-emit-dispose sequence; only the post-dispose stragglers are now ignored.

Affected files: `stream/combinator/continueWith.ts`, `stream/combinator/switchLatest.ts`, `stream/combinator/join.ts`.

## 4.5.2

### Patch Changes

#### `state(I)` widens the output type to `IStream<T | I>`

Building on 4.5.1's `state(undefined)` fix, the curried form now widens correctly for any non-`undefined` literal initial state. Previously `state(null)` inferred `T = null` and produced `IStream<null>`, which collided with whatever stream type was flowing through the pipeline:

```ts
// before 4.5.2 — type error: IStream<ChainTokenBalance[]> not assignable to IStream<null>
op(just(balancesFuture), awaitPromises, state(null))

// 4.5.2 — initial type joins the source type
const q: IStream<ChainTokenBalance[] | null> = op(
  just(balancesFuture),
  awaitPromises,
  state(null)
)
```

The overloads now infer the initial state as a separate generic `I` and produce `IStream<T | I>`, so:

```ts
state(0, numStream)         // IStream<number>          (0 subsumed by number)
state(null, numStream)      // IStream<number | null>
state('loading', numStream) // IStream<number | 'loading'>
```

#### `state(undefined, source)` is now a type error

`undefined` is the "no initial state" sentinel and only makes sense in the curried position where the source isn't yet in hand. With a source already available, the call is redundant — `state()(source)` (or `state(undefined)(source)`) expresses the same thing and reads more clearly.

The 2-arg overload now constrains its initial state to `{} | null`, which excludes `undefined`:

```ts
state(undefined)            // ok — polymorphic identity-shaped multicast-with-replay
state(undefined)(source)    // ok — applied form
op(source, state())         // ok — pipeline form (recommended)
state(undefined, source)    // ✗ type error — use state()(source) instead
```

Migration: replace any `state(undefined, source)` call with `state()(source)` (or `state(undefined)(source)`). Runtime semantics are identical.

## 4.5.1

### Patch Changes

#### `state(undefined)` infers polymorphically inside `op()` pipelines

`state(undefined)` previously produced `(source: IStream<unknown>) => IStream<unknown>` because `T` had nothing to anchor against, breaking common pipeline shapes like `op(promise, fromPromise, state(undefined))` where the upstream type should flow through unchanged.

The curried form now resolves to a polymorphic `<T>(source: IStream<T>) => IStream<T>`, instantiated by the call-site context. Same runtime behavior (no initial value cached; multicast with replay on subsequent emissions), correct inference:

```ts
const config: IStream<IHomeRouterConfig> = op(
  loadConfig(sql) as Promise<IHomeRouterConfig>,
  fromPromise,
  state(undefined)
)
```

Also covers the zero-arg form (`state()`) and `state(undefined, source)`. Typed-initial forms (`state(0)`, `state(0, source)`) unchanged.

## 4.5.0

### Minor Changes

#### `state` is now curried, with flipped argument order

`state` follows the same curry idiom as the rest of the combinator surface (`recover`, `constant`, `take`, etc.) — config first, source last:

```ts
state(initialState, source)        // direct
state(initialState)(source)        // curried
```

The previous `(source, initialState?)` order is replaced. The `initialState` parameter is now required (callers must pass `undefined` explicitly when there is no initial value) — TypeScript overload resolution can't reliably distinguish a stream-only call from a curried-with-stream-as-initial-value call, so the optional form is gone.

Migration:

```ts
state(source)                      → state(undefined, source)
state(source, 0)                   → state(0, source)
```

## 4.4.0

### Minor Changes

#### `colorShade` → `colorWeight`

The theme function `colorShade(color, intensity)` is renamed to `colorWeight(color, weight)`. The old name was misleading because the function flips direction based on theme — `intensity = 50` produces a *lighter* color in light themes (mixing toward white via `--shade-pole`) and a *darker* color in dark themes. "Shade" implies one-directional darkening.

`colorWeight` reframes the parameter as **prominence weight** — low values blend toward the theme's background pole (de-emphasized), high values stay closer to the input color (emphasized). Symmetric across themes.

```ts
import { colorWeight, palette } from 'aelea/ui-components-theme'

style({
  border: `1px solid ${colorWeight(palette.foreground, 50)}`,
  background: colorWeight(palette.background, 80)
})
```

`colorShade` is still exported as a back-compat alias (`export const colorShade = colorWeight`). Migrate at your own pace; the alias will be removed in a future major release.

### Patch Changes

#### Form interaction helpers exposed: `disabledOp`, `focusOutlineOp`

Two patterns were duplicated 4× across form components: the disabled-state pair (`styleBehavior(opacity 0.4) + attrBehavior(disabled attr)`) and the focus border highlight (`styleBehavior(merge(focus, dismiss) → borderColor: primary`). Both are now exposed from `aelea/ui-components` alongside the existing `interactionOp` / `dismissOp`:

```ts
import { disabledOp, dismissOp, focusOutlineOp, interactionOp } from 'aelea/ui-components'

$myButton(
  disabledOp(disabled),
  focusOutlineOp(focusStyle, dismissstyle),
  interactionTether(interactionOp),
  dismissTether(dismissOp)
)($content)
```

`disabledOp` returns a single `IMutator` that pushes both the style and attribute streams to the same node (uses `makeMutator` internally). `focusOutlineOp` is a thin wrapper around the `styleBehavior(merge(...))` pattern. Aelea's stock $Button, $ButtonIcon, $Checkbox now use them; $Input is left inline because its focus styling combines with validation alert state on a different border property and didn't fit the helper.

Also re-exports `$form`, `$label`, `interactionOp`, `dismissOp` from the package index — previously only reachable via deep imports. Useful for app authors building their own design system on aelea's interaction primitives without picking up the stock styled defaults.

#### `designSheet` trimmed to genuine page-level utilities

`designSheet.btn`, `designSheet.input`, `designSheet.control`, `designSheet.text`, and unused elevations (`elevation1`, `elevation3`, `elevation4`, `elevation6`, `elevation12`) are removed. The form-control and base-text styles are inlined into each component's own default container ($defaultButtonContainer, $defaultInputContainer, $defaultButtonIconContainer, $defaultDropdownAnchor) — components are now self-contained with their styling, no shared internal style hierarchy.

`designSheet` retains the three things app authors actually use: `main` (full-page reset with palette + scrollbar), `customScroll` (cross-browser scrollbar palette), and `elevation2` (the one shadow tier that had real consumers). Existing imports of `designSheet.main` / `designSheet.customScroll` / `designSheet.elevation2` continue to work.

If you imported any of the removed members directly, copy the equivalent inline styles from the component default that previously pulled them in (e.g. for the old `designSheet.btn`, see `$defaultButtonContainer` in `$Button.ts`).

Also fixes a vestigial bug in the input default: `paddingBottom: '2px'` was being clobbered by a later `padding: 0` in the same declaration block (CSS shorthand-after-longhand wipe). Dead code, removed during inlining.

#### `$Tooltip` and `$Dropdown` escape transform-trapped containing blocks

Both components used `position: fixed` directly, which becomes anchored to the nearest ancestor with `transform` / `filter` / `perspective` / `backdrop-filter` / `contain: paint` / `will-change: transform` instead of the viewport. Tooltips and dropdowns inside `fadeIn(...)`-style page transitions or any animated wrapper would land at the mid-animation rect of the wrapper, not the actual anchor. Same bug class as 4.3.2's popover fix; was silently affecting tooltip/dropdown too.

Both now use the HTML Popover API (`popover="manual"` attribute + `showPopover()` post-mount via `effectRun`). Top-layer elements have the viewport as their containing block regardless of CSS ancestry, so position computations land where they're expected. Implementation is graceful no-op (`effectRun` callback returns early) on engines without the API — Chromium 114+, Safari 17+, Firefox 125+ required for the fix to take effect.

#### `$Tooltip` and `$Dropdown` reposition every frame while open

Previously updated on `scroll` / `resize` only. Both now follow their anchor through CSS transitions, JS-driven transforms, parent motion, and any other source uniformly via `requestAnimationFrame`. The diff-and-clear styleInline applier (4.3.0) skips `setProperty` calls when the computed position matches the prior frame, so static-anchor cost is bounded to one `getBoundingClientRect` per frame plus zero DOM writes.

#### UA-stylesheet leakage on `[popover]` content

Same UA-stylesheet-leak class as 4.3.2's popover content fix: `[popover]` elements get `color: CanvasText`, `border: solid`, and `overflow: auto` from the user agent. Popover and tooltip content now reset to `color: inherit` / `border: none` / `overflow: visible`. Dropdown sets `overflow: hidden` explicitly on its own container (intentional rounded-corner clip) so its overflow override is left intact.

#### `$Popover` anchor remains visible (and interactable) above the backdrop

In versions before 4.3.2 the popover anchor was lifted above the backdrop via `Z_TARGET_ELEVATED` to spotlight the tethered anchor area. The 4.3.2 top-layer rewrite invalidated that approach (top-layer elements ignore document z-index), so the anchor disappeared behind the dim layer. Restored by giving the backdrop a `clip-path` cutout matching the anchor's bounding rect, recomputed every reposition tick. The cutout also passes pointer events through to the anchor, so anchor clicks remain functional while the popover is open — same UX as the original z-index lift.

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
