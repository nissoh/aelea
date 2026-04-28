# Aelea Takumi Renderer

Rasterize an aelea component tree to an image — `.webp` / `.png` / `.jpeg` / `.avif` — without a browser. Uses [`@takumi-rs/image-response`](https://www.npmjs.com/package/@takumi-rs/image-response) under the hood (Rust/native Go Yoga layout + Fontdue text + resvg SVG → bitmap).

## Quickstart

```ts
import { style } from 'aelea/ui'
import { $element, $text, $img, renderToImage } from 'aelea/takumi'

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

See `aelea/benchmark/og-takumi-v2.ts` for a runnable version.

## How it works

1. **Subscribe the aelea tree.** `manifestFromNode` walks the `IStream<INode>` tree with a `HeadlessScheduler` (no `requestAnimationFrame` — `paint` is a microtask). Behavior streams (`styleBehavior`, `attributesBehavior`, text streams, etc.) each populate the snapshot.
2. **Settle.** `manifestFromNode` emits progressively — the first emit is an empty root, subsequent emits fill in as descendants mount and their behavior streams fire. `renderToImage` waits until the emit stream has been idle for `settleMs` (default 250ms), then takes the latest snapshot.
3. **Project.** The settled snapshot is handed to `manifestToReact` (from `ui-renderer-manifest-react`), which produces React-element-shaped objects (`$$typeof: Symbol.for('react.element')`, …). That's what `ImageResponse` accepts.
4. **Rasterize.** `new ImageResponse(tree, opts)` → `.arrayBuffer()` returns encoded bytes.

## API

```ts
interface RenderToImageOptions {
  width: number
  height: number
  format?: 'webp' | 'png' | 'jpeg' | 'avif'
  scheduler?: I$Scheduler
  responseOptions?: /* passes through to ImageResponse: fonts, imageLoader, … */
  settleMs?: number     // default 250
  timeoutMs?: number    // default 5000 — hard ceiling on the whole call
}

function renderToImage($root: I$Node, opts: RenderToImageOptions): Promise<Uint8Array>
```

Factories:

| Factory | Tag | Takumi semantics |
|---|---|---|
| `$element(tag)` | any HTML tag | container |
| `$node` | `div` | container |
| `$custom(tag)` | any string | container |
| `$svg(tag)` | svg element | container (takumi doesn't layout SVG as SVG; project to container) |
| `$img()` + `attr({ src, width, height })` | `img` | image (takumi handles `<img>` specially — `src` is required) |
| `$text(value\|stream)` | — | text |

Node-agnostic helpers from `aelea/ui` (`style`, `attr`, `attrBehavior`, `styleBehavior`, `component`, `motion`, …) all work unchanged.

## Fonts

Takumi ships no default fonts. If your component uses text, pass fonts via `responseOptions`:

```ts
import { readFileSync } from 'node:fs'

const inter = readFileSync('./fonts/Inter-Regular.ttf')

await renderToImage($App, {
  width: 1200,
  height: 630,
  responseOptions: {
    fonts: [{ data: inter, name: 'Inter', weight: 400 }]
  }
})
```

See [`@takumi-rs/core` docs](https://www.npmjs.com/package/@takumi-rs/core) for the full options.

## What works / doesn't

**Works** — plain container layout, flex, fixed sizing, borders/border-radius, backgrounds (colors + gradients accepted as CSS strings), fonts, text shaping, images via `$img()(attr({src}))`.

**Doesn't** — SVG shapes, CSS pseudos (`:hover` etc.), animations, anything needing event loops (motion springs, intervals). Those require a live renderer; this path is a snapshot-to-bitmap.

**Tree settlement** — if your tree has async data that takes time to resolve (network fetches inside a `promiseState` stream), bump `settleMs` and `timeoutMs`. The settle logic takes the *last* emit in the quiet window, so delayed data does land if you wait long enough.

## Alternative: direct takumi-helper shapes

`manifestToReact` produces React-shaped elements because `ImageResponse` expects React. If you're using a different takumi backend (a direct `@takumi-rs/core` `Renderer` instance), the `projectNode` export gives you `TakumiContainerNode | TakumiTextNode | TakumiImageNode` matching `@takumi-rs/helpers` shape:

```ts
import { projectNode } from 'aelea/takumi'
// settledSnapshot is not exported today; roll your own via manifestFromNode
// for the bypass-ImageResponse case.
```
