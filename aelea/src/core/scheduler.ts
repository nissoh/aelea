import { type Args, disposeWith, type ISink, type ITask } from '../stream/index.js'
import type { I$Scheduler } from './types.js'

/**
 * Optimized browser scheduler for DOM operations
 *
 * Phase separation:
 * - asap() for compute phase (microtask)
 *   - Compute: Pure calculations, stream transformations
 *   - Measure: DOM reads (getBoundingClientRect, offsetWidth, etc.)
 *   - DOM Tree creation: Node.insertBefore, ParentNode.prepend
 *
 * - paint() for render phase (requestAnimationFrame)
 *   - Mutate: DOM writes (style changes, attributes)
 *   - Effect: Post-paint operations (focus, scroll, animations)
 */
class DomScheduler implements I$Scheduler {
  private computeQueue: Array<() => void> = []
  private renderQueue: Array<() => void> = []
  private computeScheduled = false
  private rafId: number | null = null

  // Standard IScheduler methods
  delay<T, TArgs extends Args>(sink: ISink<T>, task: ITask<T, TArgs>, delay: number, ...args: TArgs): Disposable {
    let cancelled = false

    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        this.executeTask(task, sink, args)
      }
    }, delay)

    return disposeWith(() => {
      cancelled = true
      clearTimeout(timeoutId)
    })
  }

  asap<T, TArgs extends Args>(sink: ISink<T>, task: ITask<T, TArgs>, ...args: TArgs): Disposable {
    let cancelled = false

    // Create closure that captures all needed values
    const fn = () => {
      if (!cancelled) {
        this.executeTask(task, sink, args)
      }
    }

    this.computeQueue.push(fn)
    this.scheduleCompute()

    return disposeWith(() => {
      cancelled = true
    })
  }

  paint<T, TArgs extends readonly unknown[]>(sink: ISink<T>, task: ITask<T, TArgs>, ...args: TArgs): Disposable {
    let cancelled = false

    // Create closure that captures all needed values
    const fn = () => {
      if (!cancelled) {
        this.executeTask(task, sink, args)
      }
    }

    this.renderQueue.push(fn)
    this.scheduleRender()

    return disposeWith(() => {
      cancelled = true
    })
  }

  time(): number {
    return performance.now()
  }

  private scheduleCompute(): void {
    if (this.computeScheduled) return
    this.computeScheduled = true

    queueMicrotask(() => {
      this.computeScheduled = false
      this.flushCompute()
    })
  }

  private flushCompute(): void {
    // Process all compute tasks
    const queue = this.computeQueue
    const len = queue.length
    this.computeQueue = []

    // Direct function calls - no object access needed
    for (let i = 0; i < len; i++) {
      queue[i]()
    }
  }

  private scheduleRender(): void {
    if (this.rafId !== null) return

    this.rafId = requestAnimationFrame(() => {
      this.rafId = null
      this.flushRender()
    })
  }

  private flushRender(): void {
    // Process all render tasks
    const queue = this.renderQueue
    const len = queue.length
    this.renderQueue = []

    // Direct function calls - no object access needed
    for (let i = 0; i < len; i++) {
      queue[i]()
    }
  }

  private executeTask(task: ITask<any, any>, sink: ISink<any>, args: readonly unknown[]): void {
    try {
      const len = args.length
      if (len === 0) {
        task(sink)
      } else if (len === 1) {
        task(sink, args[0])
      } else if (len === 2) {
        task(sink, args[0], args[1])
      } else if (len === 3) {
        task(sink, args[0], args[1], args[2])
      } else {
        task(sink, ...args)
      }
    } catch (error) {
      sink.error(error)
    }
  }
}

export function createDomScheduler(): I$Scheduler {
  return new DomScheduler()
}
