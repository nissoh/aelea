/**
 * Rasterize an aelea tree to an image by going directly through
 * `@takumi-rs/core`'s `Renderer` — no React-element shape emulation.
 *
 *   const bytes = await renderToImage($App, { width: 1200, height: 630 })
 *
 * Internally: subscribe → settle → materialize the resolved tree once →
 * project to takumi's `container`/`text`/`image` nodes → `renderer.render`.
 *
 * Settle is deterministic: with the default `SettleScheduler` the renderer
 * waits on the scheduler's `idle()` signal and finishes the instant the
 * tree's synchronous and timer-driven behaviors quiesce — no fixed
 * wall-clock delay. `settleMs` (default 0) only adds an extra quiet window
 * for trees whose data arrives via untracked promises; `timeoutMs` is a hard
 * ceiling. This keeps per-render latency at microtask scale, which matters
 * when a service streams snapshots per request.
 *
 * A single default `Renderer` is created lazily and reused across calls so
 * font / image caches amortize. Pass `renderer` to use a configured instance.
 */

import { Renderer } from '@takumi-rs/core'
import type { I$Node, I$Scheduler } from '../ui/index.js'
import { snapshotToTakumi, type TakumiNode } from './project.js'
import { createSettleScheduler, type ISettleScheduler } from './scheduler.js'
import { observeManifest, type ResolvedNode } from './snapshot.js'

export type ImageFormat = 'webp' | 'png' | 'jpeg' | 'ico' | 'raw'

// `@takumi-rs/core`'s ESM `.d.ts` types `Renderer` through an extensionless
// native re-export that NodeNext can't resolve, so its constructor options,
// `render` method, and option interfaces don't surface at type level. The
// shapes `renderToImage` needs are opaque pass-throughs, declared locally and
// the class re-typed through them.
type ConstructRendererOptions = Record<string, unknown>
type RenderOptions = Record<string, unknown>
interface ITakumiRenderer {
  render(
    source: unknown,
    options?: RenderOptions,
    signal?: AbortSignal
  ): Promise<{ buffer: ArrayBufferLike; byteOffset: number; byteLength: number }>
}
const TakumiRenderer = Renderer as unknown as new (options?: ConstructRendererOptions | null) => ITakumiRenderer

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
   * `renderer` is supplied, and ignored after the shared renderer already
   * exists — the first caller's options win for the process lifetime.
   */
  rendererOptions?: ConstructRendererOptions
  /**
   * Scheduler override — defaults to a headless scheduler with a
   * deterministic `idle()` signal. A scheduler without `idle()` falls back
   * to a wall-clock quiet window of `settleMs` (min 16ms).
   */
  scheduler?: I$Scheduler
  /**
   * Extra quiet window (ms) required after the tree goes idle before
   * settling. Default 0 — settle as soon as the scheduler is idle. Raise it
   * only for trees whose content arrives via untracked promises.
   */
  settleMs?: number
  /** Hard timeout for the whole rasterize call (default 5000ms). */
  timeoutMs?: number
  /** AbortSignal forwarded to the renderer and used to cancel the wait. */
  signal?: AbortSignal
}

let sharedRenderer: ITakumiRenderer | null = null
function getSharedRenderer(init?: ConstructRendererOptions): ITakumiRenderer {
  if (sharedRenderer === null) sharedRenderer = new TakumiRenderer(init)
  return sharedRenderer
}

function abortError(): DOMException {
  return new DOMException('Aborted', 'AbortError')
}

function asError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value))
}

function hasIdle(scheduler: I$Scheduler): scheduler is ISettleScheduler {
  return typeof (scheduler as Partial<ISettleScheduler>).idle === 'function'
}

/**
 * Resolve once `idle` settles, `maxWaitMs` elapses, or `signal` aborts.
 * Clears its own timer when `idle` wins so no stray timer outlives the call.
 */
function awaitSettlePoint(idle: Promise<void> | null, maxWaitMs: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }
    const fail = (error: unknown) => {
      if (done) return
      done = true
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
      reject(error)
    }
    const onAbort = () => fail(abortError())
    const timer = setTimeout(finish, Math.max(0, maxWaitMs))
    if (signal) {
      if (signal.aborted) return fail(abortError())
      signal.addEventListener('abort', onAbort, { once: true })
    }
    idle?.then(finish, fail)
  })
}

async function settle($root: I$Node, scheduler: I$Scheduler, opts: RenderToImageOptions): Promise<ResolvedNode> {
  const settleMs = opts.settleMs ?? 0
  const timeoutMs = opts.timeoutMs ?? 5000
  const signal = opts.signal
  if (signal?.aborted) throw abortError()

  let version = 0
  let rootError: unknown = null
  const observer = observeManifest($root, scheduler, {
    onDirty: () => {
      version++
    },
    onError: error => {
      rootError = error
      version++
    }
  })

  const idleCapable = hasIdle(scheduler)
  const deadline = Date.now() + timeoutMs

  try {
    for (;;) {
      if (rootError) throw asError(rootError)
      if (signal?.aborted) throw abortError()

      const seen = version
      const remaining = deadline - Date.now()
      if (remaining <= 0) break

      if (idleCapable) {
        await awaitSettlePoint(scheduler.idle(), remaining, signal)
        // Absorb already-resolved promise → asap hops: a settled promise's
        // continuation schedules an asap task; let those microtasks run so
        // the version bump is visible before we decide we're quiescent.
        await Promise.resolve()
        await Promise.resolve()
        if (settleMs > 0) await awaitSettlePoint(null, Math.min(settleMs, remaining), signal)
      } else {
        await awaitSettlePoint(null, Math.min(settleMs > 0 ? settleMs : 16, remaining), signal)
      }

      if (rootError) throw asError(rootError)
      if (version === seen) break
    }

    const resolved = observer.materialize()
    if (resolved === null) {
      throw new Error('renderToImage: tree produced no node before settling')
    }
    return resolved
  } finally {
    // Tearing down the observer disposes every behavior subscription, which
    // cancels any in-flight scheduler timers — so a tree with an unbounded
    // timer loop can't keep the process alive past this call.
    observer[Symbol.dispose]()
  }
}

export async function renderToImage($root: I$Node, opts: RenderToImageOptions): Promise<Uint8Array> {
  const scheduler = opts.scheduler ?? createSettleScheduler()
  const renderer: ITakumiRenderer =
    (opts.renderer as unknown as ITakumiRenderer) ?? getSharedRenderer(opts.rendererOptions)

  const resolved = await settle($root, scheduler, opts)
  const takumiTree: TakumiNode = snapshotToTakumi(resolved)

  const renderOpts: Record<string, unknown> = {
    width: opts.width,
    height: opts.height,
    format: opts.format ?? 'webp'
  }
  if (opts.devicePixelRatio !== undefined) renderOpts.devicePixelRatio = opts.devicePixelRatio
  if (opts.quality !== undefined) renderOpts.quality = opts.quality
  if (opts.drawDebugBorder) renderOpts.drawDebugBorder = true
  if (opts.fetchedResources) renderOpts.fetchedResources = opts.fetchedResources

  const buffer = await renderer.render(takumiTree as never, renderOpts as RenderOptions, opts.signal)
  // takumi returns a Node `Buffer`; surface a plain `Uint8Array` so the
  // return shape is the same in Bun / Deno / browser-bundler targets.
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
}
