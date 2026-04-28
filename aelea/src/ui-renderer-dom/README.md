# Aelea DOM Rendering Engine

Maps a tree of `IStream<INode>` (and `IStream<ITextNode>`) values into live DOM nodes whose lifecycle is tied to stream disposal. No virtual DOM, no diffing — mount/update/unmount is driven by stream events and the disposable chain.

## The two-layer split

Rendering is split so the same component code can target different runtimes (live DOM, headless manifest → React-element snapshot, takumi → image bytes, and future Bun-native / custom renderers).

### `src/ui/` — renderer-agnostic core

| File | Provides | Purpose |
|---|---|---|
| `types.ts` | `INode`, `ISlottable`, `ITextNode`, `INodeCompose`, `I$Slottable`, `IOutputTethers`, `IComponentBehavior` | Shape of a UI tree. `INode<TElement>` is `{ element, $segments, style, styleBehavior, styleInline, stylePseudo, attributes, attributesBehavior, propBehavior }` — a renderer-agnostic description of "a thing to mount." `ISlotChild<T>` includes `null` as the unmount sentinel. |
| `node.ts` | `createNode(createElement, postOp)`, `$text(…)` | The abstract factory. `createElement` produces the per-renderer element handle (HTMLElement, TakumiElement, plain object, …). `createNode` returns a curried `INodeCompose` that collects children + ops and emits an `INode` when subscribed. |
| `scheduler.ts` | `createDomScheduler`, `createHeadlessScheduler` | DOM scheduler uses `requestAnimationFrame` for its `paint()` phase; headless scheduler has `paint === asap` for Node/Bun environments that don't benefit from frame-aligned writes. |
| `combinator/` | `style`, `styleInline`, `styleBehavior`, `stylePseudo`, `attr`, `attrBehavior`, `effectProp`, `effectRun`, `motion`, `component` | Operators that transform an `IStream<INode>`. They mutate the `INode` contract fields in place (`node.style`, `node.styleBehavior[]`, …) — no whole-node spread, so ops are O(1). The renderer reads these fields. |

Nothing here touches the DOM.

### `src/ui-renderer-dom/` — DOM-specific renderer

| File | Provides | Purpose |
|---|---|---|
| `factories.ts` | `$element`, `$svg`, `$custom`, `$node`, `$wrapNativeElement` | DOM-backed `createNode` wrappers. `$element('div')` = `createNode(() => document.createElement('div'))`. |
| `dom.ts` | `render({ rootAttachment, $rootNode, scheduler?, onError? })`, `createStyleRule`, `createStylePseudoRule` | The renderer. Walks an `INode`, creates real DOM nodes, wires subscriptions, routes dynamic writes through `scheduler.paint`. |
| `event.ts` | `nodeEvent`, `fromEventTarget` | DOM-bound event helpers. `nodeEvent('click')` is an `IOps<ISlottable<Node>, MouseEvent>` used with tethers. |
| `types.ts` | DOM-specialized aliases (`INodeDom`, `INodeElementDom`, …) | Same shapes as `src/ui/` with `TElement` pinned to `HTMLElement | SVGElement`. |

Other renderers of the same surface: `ui-renderer-manifest` (emits a stream of resolved INode snapshots), `ui-renderer-manifest-react` (projects a snapshot to React-element shape), `ui-renderer-takumi` (composes the former two + `ImageResponse` to produce image bytes from aelea components).

## Lifecycle model

### Slot

A "slot" is one spot in the tree, populated by a stream of child values. Each `INode.$segments[i]` is a slot, and `render`'s root is also a slot. A slot holds at most one mounted child at a time.

`renderSlotAt($slot, parent, anchor, env)` subscribes to `$slot` with a sink that:

1. On `event(nodeOrText)`:
   - disposes the previous mounted child's subscription chain and removes its DOM node from `parent`
   - if the value is `null` (the unmount sentinel in `ISlotChild<T>`), stops — slot now has no content
   - otherwise calls `mountNodeOrText(value, env)`, which creates the element, applies static style/attrs, subscribes to every stream in the `INode`'s behavior arrays (paint-batched), and recursively descends into each `$segment`
   - inserts the new element *before* `anchor` (a comment node reserved at mount time for this slot's position)
2. On `error(err)`: forwards to `env.onError`, default `console.error`. Can be routed into app telemetry via `render({ onError })`.
3. On `end()`: no-op. Aelea's node factories (`$element`, `$text`) emit-once-don't-end, so end is rare; when it does happen (e.g. a user writes `just(node)` as a slot) we keep the mounted child alive until the outer disposable fires.
4. On outer disposal (`Symbol.dispose` on the handle returned by `renderSlotAt`): disposes the slot subscription AND the current mount's disposables AND removes both the element and the anchor.

This is the only unmount path besides re-emit: when the disposable representing the slot's subscription gets disposed from above (a parent slot re-emitting, which cascades disposal through its `childDisposables`), the slot's current mount tears down.

### Segment order: anchor comments

For a node with several `$segments`, each segment is an independent `I$Slottable` with its own emit timing. If one segment's stream emits synchronously and another emits asynchronously, a naive "append on first emit" would put DOM children in *emit* order — which almost always diverges from *declaration* order.

The renderer reserves a placeholder comment node per segment at mount time, then each segment's `renderSlotAt` inserts its element *before* that anchor. Anchors are appended to `parent` in declaration order, so elements end up in declaration order regardless of which stream emits first. Unmounting a segment removes the element but leaves the anchor in place, so re-emits land in the same slot.

### Per-node subscription fan-out

Every `INode` can carry these stream-driven behaviors, each handled by the renderer as its own disposable merged into `childDisposables`:

| Field | Effect on every emit |
|---|---|
| `propBehavior: { key, value }[]` | `(element as any)[key] = v` — direct property set (e.g., `value` on an `<input>`). Paint-batched. |
| `styleInline: IStream<IStyleCSS>[]` | `element.style.setProperty(kebab(k), v)` per key — reactive inline styles (additive; never clears). Paint-batched. |
| `styleBehavior: IStream<IStyleCSS\|null>[]` | tracks keys set last emission; on each new emission, removes prior keys that aren't in the new value (the browser cascades back to the class-based static rule, or nothing) and sets the new values. `null` reverts everything that stream owned. This is how "hover highlight" / "active state" are wired. Paint-batched. |
| `attributesBehavior: IStream<IAttr>[]` | `element.setAttribute`/`removeAttribute` per key. Paint-batched. |
| `stylePseudo` (static array, not a stream) | `createStylePseudoRule(':hover', …)` mints a cached CSS rule in the shared sheet and adds the returned class to the element |

Static `node.style` goes through `createStyleRule` → cached class name, added to the element's `classList`. Static `node.attributes` are applied once during mount via `applyAttributes`.

### Why slot disposal matters

When a slot re-emits (e.g. `switchMap` swapping content, a list reducer producing a new item stream), if the renderer doesn't tear down the previous child:

- Old DOM nodes accumulate as siblings instead of being replaced.
- Old subscriptions keep firing into detached elements, wasting CPU and leaking memory.
- `stylePseudo` rules are inserted into the shared sheet on every re-emit, so the sheet grows without bound and old `:hover` rules still match the (still-in-DOM) stale elements, producing "stuck hover" artifacts.

`renderSlotAt` guards against all three by disposing `current` before mounting the new value. `stylePseudo` rules are additionally deduplicated: `createStylePseudoRule` keys on the sorted serialized style + pseudo, so identical rules from repeated mounts resolve to the same class.

## Style handling: classes vs inline

Static styles → cached CSS rules → classes. Reactive streams → inline `style.setProperty`. Cascade is the browser's.

```
element.style  (inline, lowest specificity cascade slot)
  └ styleInline / styleBehavior stream updates land here
element.classList
  └ ae-N class minted by createStyleRule(node.style)     — static style
  └ ae-M class minted by createStylePseudoRule(':hover', …) — static pseudo
```

Consequences:
- Identical static styles across the tree share one rule — HTML is smaller, computed-style is shareable across like elements.
- `styleBehavior` returning `null` removes its inline property → browser cascades back to the class rule automatically. No baseline tracking needed.
- `style({ x })` + `styleBehavior(…{ x }…)` both set the same `x` cleanly: the class provides the default, the inline override takes precedence, clearing the inline restores the default.

The rule cache is a `Map<canonicalKey, className>`. Keys are sorted `kebab-case:value;` strings so `{a:1,b:2}` and `{b:2,a:1}` hit the same slot.

## Paint batching

All dynamic writes (propBehavior, styleInline, styleBehavior, attributesBehavior, text-node updates from stream values) route through `makePaintWriter(scheduler, apply)`. Each writer holds a single `pending` value: multiple emissions within the same event-loop tick overwrite `pending`, and only one `apply` fires per paint frame. The underlying `scheduler.paint(task)` defers to `requestAnimationFrame` in the browser, to `queueMicrotask` under `createHeadlessScheduler`.

Net effect: a stream that fires 20x per tick triggers 20 JS handlers but one layout/paint commit — no thrashing.

## The `null` unmount sentinel

`switchLatest(map(isMatch => isMatch ? ns : empty, routeMatch))` — the `empty` path internally ends, but the outer `switchLatest` output stream never emits anything, never ends. The downstream slot can't tell "I should unmount now" from "source is quiet."

Solution: `null` is a first-class variant of `ISlotChild<T>`. `router.match` and `router.contains` emit `just(null)` on unmatch. `renderSlotAt` sees `null`, tears down `current`, leaves the anchor in place. Next `true` → new content lands in the same slot.

Contract:
- slot stream emits a node/text → mount (replaces any previous content)
- slot stream emits `null` → unmount current, slot is empty
- slot stream ends → keep last mount alive until outer disposal
- outer disposal → tear down everything

## Event lifecycle for tethers

`nodeEvent('click')` is `IOps<ISlottable<Node>, MouseEvent>` that wraps `addEventListener` via `fromCallback`. Behavior pattern:

```ts
component(([click, clickTether]: IBehavior<ISlottable<Node>, MouseEvent>) => [
  $element('button')(
    clickTether(nodeEvent('click'))
  )($text('click me'))
])
```

The tether composes `nodeEvent('click')` onto the node's event pipeline, scheduled via the node's lifecycle. When the slot unmounts, the tether's subscription is torn down alongside the element's `childDisposables`.

## Scheduler

`createDomScheduler()` exposes:
- `asap(task)` — `queueMicrotask`, for compute + DOM reads
- `paint(task)` — `requestAnimationFrame`, for DOM writes (one frame, N writes)
- `delay(task, ms)` — `setTimeout`; drains any pending `asap` queue first

`createHeadlessScheduler()` — for Node / Bun / pipelines that don't have a real compositor. `paint` is a microtask; there's no raf polyfill of `globalThis` (the takumi renderer uses this).

## Headless / alternate-renderer ergonomics

The implicit DOM API used by the renderer: `document.createComment`, `document.createTextNode`, `Element.insertBefore`, `Element.removeChild`, `Element.setAttribute`, `Element.removeAttribute`, `Element.style.setProperty`, `Element.style.removeProperty`, `Element.classList.add`, `Element.classList.remove`. `document.createElement`, `document.getElementById`, and `document.head.appendChild` are needed if class-based static styles are used; `createStyleRule` returns `null` in their absence so styles fall back to inline writes.

`aelea/benchmark/headless-render.ts` is a reference minimal shim that exercises this surface without a real DOM.

## Known limitations

- `stylePseudo` rules are cached but not deleted from the sheet. Over a long-running app with lots of distinct pseudo styles, the sheet grows without bound (bounded by the number of distinct serialized styles, not by mount count). Per-rule ref-counting + `sheet.deleteRule` is a followup if it matters.
- SVG elements rely on the browser having `element.classList` and the namespace being handled at `createElement` time (the DOM `$svg` factory uses `document.createElementNS`). Takumi's renderer projects SVG → container; for real SVG rasterization, go through an `$img` data-URL.
