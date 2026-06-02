# Aelea Takumi Renderer

Rasterize an aelea component tree to an image — `.webp` / `.png` / `.jpeg` — without a browser. Goes straight through [`@takumi-rs/core`](https://www.npmjs.com/package/@takumi-rs/core)'s `Renderer` (native Yoga layout + text shaping + raster). No React round-trip, no `ImageResponse`.

## Quickstart

```ts
import { style } from 'aelea/ui'
import { $element, $text, renderToImage } from 'aelea/takumi'

const $Card = $element('div')(
  style({
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0b1220',
    color: '#e8f0ff',
    fontFamily: 'Inter, sans-serif'
  })
)(
  $element('div')(style({ padding: '48px', fontSize: '56px' }))(
    $text('Aelea UI')
  )
)

const bytes: Uint8Array = await renderToImage($Card, {
  width: 1200,
  height: 630,
  format: 'webp'
})
```

The result is raw bytes — write to disk, return as a `Response`, stream to S3, whatever. `renderToImage` does not touch the filesystem.

See `aelea/benchmark/render/og-takumi.ts` for a runnable version.

## How it works

1. **Subscribe.** `observeManifest` walks the `IStream<INode>` tree under a headless scheduler (no `requestAnimationFrame`). Behavior streams (`styleBehavior`, `attributesBehavior`, `$text(stream)`, slots) update *live* per-channel state — no snapshot is built per emit.
2. **Settle (deterministically).** The default scheduler exposes an `idle()` signal that resolves the moment no microtask batch is queued and no `delay` timer is pending. `renderToImage` waits on it and a version check, so it finishes as soon as the tree's synchronous and timer-driven behaviors quiesce — typically microtask scale, ~1ms — not after a fixed wall-clock window. `settleMs` (default `0`) adds an extra quiet guard only for promise-driven data; `timeoutMs` (default `5000`) is the hard ceiling.
3. **Materialize once.** The settled observer is walked a single time into a plain `ResolvedNode` tree (string styles/attrs, `ResolvedNode | string` children, no streams). Style is merged from independent layers — `static < inline < behavior` — so a channel re-emitting a partial object never clobbers another channel's keys.
4. **Project + rasterize.** `snapshotToTakumi` maps the resolved tree to takumi's `container` / `text` / `image` nodes, then `renderer.render(tree, opts)` returns encoded bytes.

A single default `Renderer` is created lazily and reused across calls, so font/image caches amortize across renders — ideal for a service streaming snapshots per request. Pass your own `renderer` for configured fonts/caches.

## API

```ts
interface RenderToImageOptions {
  width: number
  height: number
  format?: 'webp' | 'png' | 'jpeg' | 'ico' | 'raw'  // default 'webp'
  devicePixelRatio?: number
  quality?: number                 // jpeg quality 0–100
  drawDebugBorder?: boolean
  fetchedResources?: unknown[]     // pre-fetched image resources, passed to takumi
  renderer?: Renderer              // configured @takumi-rs/core instance
  rendererOptions?: ConstructorParameters<typeof Renderer>[0]  // first caller wins
  scheduler?: I$Scheduler          // default: headless scheduler with idle()
  settleMs?: number                // default 0 — extra quiet window after idle
  timeoutMs?: number               // default 5000 — hard ceiling
  signal?: AbortSignal
}

function renderToImage($root: I$Node, opts: RenderToImageOptions): Promise<Uint8Array>
```

Lower-level exports for authors driving their own projection:

```ts
import {
  observeManifest,    // live observer: { materialize(): ResolvedNode | null, [Symbol.dispose]() }
  snapshotStream,     // IStream<ResolvedNode> — coalesced snapshot per microtask batch
  snapshotToTakumi,   // ResolvedNode -> TakumiNode
  createSettleScheduler,
  type ResolvedNode
} from 'aelea/takumi'
```

Factories:

| Factory | Tag | Takumi semantics |
|---|---|---|
| `$element(tag)` | any HTML tag | container |
| `$node` | `div` | container |
| `$custom(tag)` | any string | container |
| `$svg(tag)` | svg element | container (takumi doesn't layout SVG as SVG) |
| `$element('img')` + `attr({ src, width, height })` | `img` | image (takumi handles `<img>` specially — `src` is required) |
| `$text(value\|stream)` | — | text |

Node-agnostic helpers from `aelea/ui` (`style`, `attr`, `attrBehavior`, `styleBehavior`, `component`, …) all work unchanged.

## Fonts

Takumi ships no default fonts. If your component uses text, supply fonts via `rendererOptions` — they configure the shared renderer on first use:

```ts
import { readFileSync } from 'node:fs'

await renderToImage($App, {
  width: 1200,
  height: 630,
  rendererOptions: { fonts: [readFileSync('./fonts/Inter-Regular.ttf')] }
})
```

For per-call font sets or a persistent image cache, construct your own `Renderer` and pass it as `renderer`. Note: `@takumi-rs/core`'s ESM types don't currently surface the `Renderer` constructor under `NodeNext`, so the construction needs a cast until upstream ships resolvable types:

```ts
import { Renderer } from '@takumi-rs/core'
import { readFileSync } from 'node:fs'

const renderer = new (Renderer as unknown as new (opts?: unknown) => Renderer)({
  fonts: [readFileSync('./fonts/Inter-Regular.ttf')]
})

await renderToImage($App, { width: 1200, height: 630, renderer })
```

See [`@takumi-rs/core` docs](https://www.npmjs.com/package/@takumi-rs/core) for the full options.

## What works / doesn't

**Works** — container layout, flex, fixed sizing, borders/border-radius, backgrounds (colors + gradients as CSS strings), fonts, text shaping, images via `$element('img')(attr({ src }))`, reactive `styleBehavior` / `attributesBehavior` / `$text(stream)` (their settled value is captured).

**Doesn't** — SVG shapes, CSS pseudos (`:hover` etc. are dropped — static raster has no interaction), continuous animation. A finite timer/spring *is* awaited (the scheduler tracks `delay`), so its final resting value is captured; an unbounded animation loop runs until `timeoutMs`, then the latest frame is taken.

**Async data** — `idle()` cannot see bare promises (`fromPromise` / `switchMap(async …)`) that resolve over the network, since they don't touch the scheduler. Resolve such data at the boundary before rendering (the aelea way), or bump `settleMs` to add a quiet window. Already-resolved promises re-enter via `asap` and are absorbed automatically.

## Performance notes

- Settle is deterministic and microtask-scale (~1ms warm), not a fixed delay — per-render latency is dominated by the native rasterize, which is what you want for snapshot-per-request services.
- The default `Renderer` is shared and lazily created; the first caller's `rendererOptions` win for the process lifetime. Pass an explicit `renderer` per call if you need different font sets.
- The tree is materialized exactly once per render (after settle), so a burst of mount-time behavior emissions costs O(emits) bookkeeping, not O(emits × tree-size) clones.
