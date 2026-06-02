/**
 * Aelea takumi renderer — rasterize an aelea tree into an image without
 * going through a browser or a React round-trip. Uses `@takumi-rs/core`'s
 * `Renderer` directly; trees are projected into takumi's native
 * `container` / `text` / `image` node shape via `snapshotToTakumi`.
 *
 *   import { $element, $text, style } from 'aelea/ui'
 *   import { renderToImage } from 'aelea/takumi'
 *
 *   const bytes = await renderToImage(
 *     $element('div')(style({ fontSize: '56px' }))($text('Aelea')),
 *     { width: 600, height: 200 }
 *   )
 *
 * Settling is deterministic — `renderToImage` finishes the instant the
 * tree's synchronous and timer-driven behaviors quiesce (via the scheduler's
 * `idle()` signal), not after a fixed wall-clock delay. This keeps per-render
 * latency at microtask scale for snapshot-per-request services.
 *
 * Authors can also build takumi trees directly (bypassing the rasterizer) by
 * combining `snapshotStream` / `observeManifest` with `snapshotToTakumi`, and
 * handing the node to their own `Renderer` instance.
 */

export type { TakumiContainerNode, TakumiImageNode, TakumiNode, TakumiTextNode } from './project.js'
export { snapshotToTakumi } from './project.js'
export { type ImageFormat, type RenderToImageOptions, renderToImage } from './render.js'
export { createSettleScheduler, type ISettleScheduler } from './scheduler.js'
export { type IManifestObserver, observeManifest, type ResolvedNode, snapshotStream } from './snapshot.js'
