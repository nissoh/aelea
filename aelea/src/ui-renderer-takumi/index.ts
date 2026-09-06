/**
 * Rasterize an aelea tree to an image or SVG without a browser, through
 * `@takumi-rs/core`. The tree mounts into a live observer via the same mount
 * walk the DOM renderer uses, settles on the headless scheduler's `idle()`
 * signal, materializes once, and projects to takumi's node shape.
 *
 *   import { $element, $text, style } from 'aelea/ui'
 *   import { renderToImage } from 'aelea/takumi'
 *
 *   const bytes = await renderToImage(
 *     $element('div')(style({ fontSize: '56px' }))($text('Aelea')),
 *     { width: 600, height: 200, format: 'webp' }
 *   )
 */

export type { ContainerNode, ImageNode, Node as TakumiNode, TextNode } from '@takumi-rs/core'
export { snapshotToTakumi } from './project.js'
export {
  type IRendererChoice,
  type ISettleOptions,
  type RenderToImageOptions,
  type RenderToSvgOptions,
  renderToImage,
  renderToSvg,
  settle
} from './render.js'
export { type IManifestObserver, observeManifest, type ResolvedNode, snapshotStream } from './snapshot.js'
