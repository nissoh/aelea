# Aelea Takumi Renderer

Rasterize an aelea component tree to an image or an SVG without a browser, through [`@takumi-rs/core`](https://www.npmjs.com/package/@takumi-rs/core) 2 (native layout, text shaping and raster).

## Quickstart

```ts
import { style } from 'aelea/ui'
import { $element, $text, renderToImage, renderToSvg } from 'aelea/takumi'

const $Card = $element('div')(
  style({ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' })
)($element('div')(style({ padding: '48px', fontSize: '56px' }))($text('Aelea UI')))

const webp = await renderToImage($Card, { width: 1200, height: 630, format: 'webp', quality: 80 })
const svg = await renderToSvg($Card, { width: 1200, height: 630 })
```

`renderToImage` returns raw bytes as a `Uint8Array`; write them to disk, return them as a `Response`, stream them anywhere. With no `format` takumi encodes PNG.

## How it works

1. **Mount.** The tree mounts through the same mount walk the DOM renderer uses (`ui/backend.ts`), into an observer backend whose elements are plain records. Reactive channels write straight into those records, so a burst of emissions costs O(emits) bookkeeping.
2. **Settle.** The headless scheduler exposes `idle()`, which resolves the moment no asap batch and no timer is pending, so the render finishes as soon as the tree's synchronous and timer-driven behaviors quiesce, typically within a millisecond. `settleMs` adds an extra quiet window only for data arriving through promises the scheduler cannot observe; `timeoutMs` (default 5000) is the ceiling.
3. **Materialize once.** The settled records are copied into a `ResolvedNode` tree: string styles and attributes, `ResolvedNode | string` children.
4. **Project and render.** `snapshotToTakumi` maps the tree to takumi's `container` / `text` / `image` nodes (an `img` with a `src` attribute becomes an image node; every container carries its `tagName`), then `renderer.render` or `renderer.renderSvg` produces the output.

Effects and property writes have no meaning off the DOM and are inert. Pseudo-class styles are not projected.

## Options

Every takumi render option passes straight through: `width`, `height`, `format`, `quality`, `lossless`, `devicePixelRatio`, `fonts`, `images`, `css`, `dithering`, `fontFamilies`, `lang`, `signal`, and the rest of `RenderOptions`. `signal` also cancels the settle wait.

The aelea-side options control the settle and the renderer instance:

```ts
interface ISettleOptions {
  scheduler?: I$Scheduler   // defaults to createHeadlessScheduler()
  settleMs?: number         // extra quiet window after idle, default 0
  timeoutMs?: number        // hard ceiling, default 5000
}
interface IRendererChoice {
  renderer?: Renderer               // a configured takumi Renderer
  rendererOptions?: RendererOptions // init for the shared renderer; first caller wins
}
```

A single shared `Renderer` is created lazily and reused across calls so font and image caches amortize. Register fonts once on your own instance with `renderer.registerFont(...)` and pass it as `renderer`, or pass `fonts` per render.

## Lower-level pieces

- `settle($root, opts)`: mount, wait for quiescence, return the `ResolvedNode` tree.
- `observeManifest($root, scheduler, handlers)`: a live observer with `materialize()`.
- `snapshotStream($root)`: a stream of `ResolvedNode` snapshots, one per asap batch.
- `snapshotToTakumi(resolved)`: the projection, for hand-built pipelines.

See `aelea/benchmark/render/og-takumi.ts` for a runnable card render.
