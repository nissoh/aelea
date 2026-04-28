/**
 * Rasterize an aelea tree to an image by going directly through
 * `@takumi-rs/core`'s `Renderer` — no React-element shape emulation.
 *
 *   const bytes = await renderToImage($App, { width: 1200, height: 630 })
 *
 * Internally: subscribe → snapshot → project to takumi's
 * `container`/`text`/`image` node tree → `renderer.render(tree, opts)`.
 *
 * A single default `Renderer` is created lazily and reused across calls
 * so font / image caches amortize. Pass `renderer` in options to use a
 * configured instance (fonts, persistentImages, resourceCacheCapacity).
 */

import { Renderer } from '@takumi-rs/core'
import { createHeadlessScheduler, type I$Node, type I$Scheduler, type INode } from '../ui/index.js'
import { snapshotToTakumi, type TakumiNode } from './project.js'
import { snapshotStream } from './snapshot.js'

export type ImageFormat = 'webp' | 'png' | 'jpeg' | 'ico' | 'raw'

// Captured here rather than imported because the installed
// `@takumi-rs/core` doesn't publicly export these through the ESM entry,
// and we want `renderToImage`'s options surface to stay typed regardless.
type ConstructRendererOptions = NonNullable<ConstructorParameters<typeof Renderer>[0]>
type RenderOptionsShape = Parameters<Renderer['render']>[1]

export interface RenderToImageOptions {
  width: number
  height: number
  format?: ImageFormat
  /** Pixel ratio forwarded to takumi (default 1). */
  devicePixelRatio?: number
  /** JPEG quality (0–100) when `format: 'jpeg'`. */
  quality?: number
  /** Draw debug borders around laid-out nodes. */
  drawDebugBorder?: boolean
  /**
   * Pre-fetched image resources keyed by `src`, passed through to takumi
   * so it doesn't need to resolve them itself. See takumi's
   * `fetchedResources` / `extractResourceUrls` docs.
   */
  fetchedResources?: unknown[]
  /**
   * Supply a pre-configured `Renderer` instance (for persistent fonts,
   * image caching, etc.). Defaults to a lazily-created shared renderer.
   */
  renderer?: Renderer
  /**
   * Init options for the default shared renderer on first use. Ignored if
   * `renderer` is supplied.
   */
  rendererOptions?: ConstructRendererOptions
  /** Scheduler override — defaults to a headless (no-raf) scheduler. */
  scheduler?: I$Scheduler
  /**
   * The snapshot stream emits progressively as the tree populates. We wait
   * for the emit stream to be quiet for `settleMs` (default 250ms), then
   * take the latest snapshot.
   */
  settleMs?: number
  /** Hard timeout for the whole rasterize call (default 5000ms). */
  timeoutMs?: number
  /** AbortSignal forwarded to the renderer and used to cancel the wait. */
  signal?: AbortSignal
}

let sharedRenderer: Renderer | null = null
function getSharedRenderer(init?: ConstructRendererOptions): Renderer {
  if (sharedRenderer === null) sharedRenderer = new Renderer(init)
  return sharedRenderer
}

export async function renderToImage($root: I$Node, opts: RenderToImageOptions): Promise<Uint8Array> {
  const scheduler = opts.scheduler ?? createHeadlessScheduler()
  const renderer = opts.renderer ?? getSharedRenderer(opts.rendererOptions)

  const snapshot = await settledSnapshot($root, scheduler, opts)
  const takumiTree: TakumiNode = snapshotToTakumi(snapshot)

  const renderOpts: Record<string, unknown> = {
    width: opts.width,
    height: opts.height,
    format: opts.format ?? 'webp'
  }
  if (opts.devicePixelRatio !== undefined) renderOpts.devicePixelRatio = opts.devicePixelRatio
  if (opts.quality !== undefined) renderOpts.quality = opts.quality
  if (opts.drawDebugBorder) renderOpts.drawDebugBorder = true
  if (opts.fetchedResources) renderOpts.fetchedResources = opts.fetchedResources

  const buffer = await renderer.render(takumiTree as never, renderOpts as RenderOptionsShape, opts.signal)
  // takumi returns a Node `Buffer`; surface a plain `Uint8Array` so the
  // return shape is the same in Bun / Deno / browser-bundler targets.
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
}

function settledSnapshot($root: I$Node, scheduler: I$Scheduler, opts: RenderToImageOptions): Promise<INode> {
  const settleMs = opts.settleMs ?? 250
  const timeoutMs = opts.timeoutMs ?? 5000

  return new Promise<INode>((resolve, reject) => {
    let settled = false
    let latest: INode | null = null
    let disp: Disposable | null = null
    let settleTimer: ReturnType<typeof setTimeout> | null = null

    const finish = () => {
      if (settled) return
      settled = true
      clearTimeout(hardTimer)
      if (settleTimer) clearTimeout(settleTimer)
      disp?.[Symbol.dispose]?.()
      if (latest) resolve(latest)
      else reject(new Error('renderToImage: settled without a snapshot'))
    }

    const abort = () => {
      if (settled) return
      settled = true
      clearTimeout(hardTimer)
      if (settleTimer) clearTimeout(settleTimer)
      disp?.[Symbol.dispose]?.()
      reject(new DOMException('Aborted', 'AbortError'))
    }

    const hardTimer = setTimeout(() => {
      if (settled) return
      settled = true
      if (settleTimer) clearTimeout(settleTimer)
      disp?.[Symbol.dispose]?.()
      if (latest) resolve(latest)
      else reject(new Error(`renderToImage: no snapshot within ${timeoutMs}ms`))
    }, timeoutMs)

    opts.signal?.addEventListener('abort', abort, { once: true })

    const armSettle = () => {
      if (settleTimer) clearTimeout(settleTimer)
      settleTimer = setTimeout(finish, settleMs)
    }

    disp = snapshotStream($root, scheduler).run(
      {
        event(_t, m) {
          if (settled) return
          latest = m as INode
          armSettle()
        },
        error(_t, err) {
          if (settled) return
          settled = true
          clearTimeout(hardTimer)
          if (settleTimer) clearTimeout(settleTimer)
          disp?.[Symbol.dispose]?.()
          reject(err instanceof Error ? err : new Error(String(err)))
        },
        end() {
          if (latest) finish()
          else {
            settled = true
            clearTimeout(hardTimer)
            if (settleTimer) clearTimeout(settleTimer)
            reject(new Error('renderToImage: source ended before emitting'))
          }
        }
      },
      scheduler
    ) as unknown as Disposable
  })
}
