import { Renderer, type RendererOptions, type RenderOptions, type SvgRenderOptions } from '@takumi-rs/core'
import type { IIdleScheduler } from '../stream/index.js'
import { createHeadlessScheduler } from '../ui/scheduler.js'
import type { I$Node, I$Scheduler } from '../ui/types.js'
import { snapshotToTakumi } from './project.js'
import { observeManifest, type ResolvedNode } from './snapshot.js'

export interface ISettleOptions {
  /**
   * Scheduler the tree runs under. Defaults to the headless scheduler, whose
   * `idle()` lets the render finish the instant the tree's synchronous and
   * timer-driven behaviors quiesce. A scheduler without `idle()` falls back
   * to a wall-clock quiet window of `settleMs` (min 16ms).
   */
  scheduler?: I$Scheduler
  /**
   * Extra quiet window (ms) after the tree goes idle. Default 0. Raise it
   * only for trees whose content arrives via promises the scheduler cannot
   * observe.
   */
  settleMs?: number
  /** Hard ceiling for the settle wait (default 5000ms). */
  timeoutMs?: number
}

export interface IRendererChoice {
  /** A configured `Renderer` (fonts, caches). Defaults to a lazily created shared instance. */
  renderer?: Renderer
  /** Init options for the shared renderer on first use; the first caller's options win. */
  rendererOptions?: RendererOptions
}

/**
 * Every takumi `render` option passes straight through (`width`, `height`,
 * `format`, `quality`, `lossless`, `fonts`, `images`, `css`, `signal`, …);
 * the aelea-side options control how the tree settles before rasterizing.
 */
export type RenderToImageOptions = RenderOptions & ISettleOptions & IRendererChoice

export type RenderToSvgOptions = SvgRenderOptions & ISettleOptions & IRendererChoice

const AELEA_KEYS = ['scheduler', 'settleMs', 'timeoutMs', 'renderer', 'rendererOptions'] as const

let sharedRenderer: Renderer | null = null
function getSharedRenderer(init?: RendererOptions): Renderer {
  if (sharedRenderer === null) sharedRenderer = new Renderer(init)
  return sharedRenderer
}

function abortError(): DOMException {
  return new DOMException('Aborted', 'AbortError')
}

function asError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value))
}

function hasIdle(scheduler: I$Scheduler): scheduler is I$Scheduler & IIdleScheduler {
  return typeof (scheduler as Partial<IIdleScheduler>).idle === 'function'
}

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

/**
 * Mount the tree, wait until it quiesces, materialize once, tear down.
 * Teardown disposes every behavior subscription, so a tree with an unbounded
 * timer loop cannot keep the process alive past this call.
 */
export async function settle($root: I$Node, opts: ISettleOptions & { signal?: AbortSignal }): Promise<ResolvedNode> {
  const scheduler = opts.scheduler ?? createHeadlessScheduler()
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
    observer[Symbol.dispose]()
  }
}

function takumiOptions<O extends object>(opts: O): Omit<O, (typeof AELEA_KEYS)[number]> {
  const out = { ...opts } as Record<string, unknown>
  for (const key of AELEA_KEYS) delete out[key]
  return out as Omit<O, (typeof AELEA_KEYS)[number]>
}

export async function renderToImage($root: I$Node, opts: RenderToImageOptions): Promise<Uint8Array> {
  const renderer = opts.renderer ?? getSharedRenderer(opts.rendererOptions)
  const resolved = await settle($root, opts)
  const buffer = await renderer.render(snapshotToTakumi(resolved), takumiOptions(opts) as RenderOptions)
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
}

export async function renderToSvg($root: I$Node, opts: RenderToSvgOptions = {}): Promise<string> {
  const renderer = opts.renderer ?? getSharedRenderer(opts.rendererOptions)
  const resolved = await settle($root, opts)
  return renderer.renderSvg(snapshotToTakumi(resolved), takumiOptions(opts) as SvgRenderOptions)
}
