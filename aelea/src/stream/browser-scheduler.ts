import type { IScheduler, ITask } from './types.js'
import { disposeWith } from './utils/disposable.js'

/**
 * Browser-optimized scheduler implementation using native queueMicrotask
 *
 * This scheduler is optimized for browser environments where:
 * - DOM operations are common
 * - Microtask timing is critical for smooth UI updates
 * - Memory efficiency is important
 *
 * For specialized needs, you can implement your own IScheduler:
 *
 * - High-throughput: Add batching/buffering
 * - Testing: Use synchronous execution
 * - Debugging: Add logging/tracing
 * - Priority: Implement priority queues
 *
 * The IScheduler interface is designed to be simple to implement
 * while allowing full control over task scheduling.
 */
export class BrowserScheduler implements IScheduler {
  asap<TArgs extends readonly unknown[]>(task: ITask<TArgs>, ...args: TArgs): Disposable {
    let cancelled = false

    queueMicrotask(() => {
      if (!cancelled) task(...args)
    })

    return disposeWith(() => {
      cancelled = true
    })
  }

  delay<TArgs extends readonly unknown[]>(task: ITask<TArgs>, delay: number, ...args: TArgs): Disposable {
    let cancelled = false

    const timeoutId = setTimeout(() => {
      if (!cancelled) task(...args)
    }, delay)

    return disposeWith(() => {
      cancelled = true
      clearTimeout(timeoutId)
    })
  }

  time(): number {
    return performance.now()
  }
}

export function createBrowserScheduler(): IScheduler {
  return new BrowserScheduler()
}
