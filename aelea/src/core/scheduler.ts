import { type Args, disposeWith, type ISink, type ITask } from '../stream/index.js'
import type { I$Scheduler } from './types.js'

interface Task<T = any> {
  sink: ISink<T>
  task: ITask<T, any>
  args: readonly unknown[]
  cancelled?: boolean
}

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
  private computeQueue: Task[] = []
  private renderQueue: Task[] = []
  private computeScheduled = false
  private rafId: number | null = null

  // Standard IScheduler methods
  delay<T, TArgs extends Args>(sink: ISink<T>, task: ITask<T, TArgs>, delay: number, ...args: TArgs): Disposable {
    let cancelled = false
    const timeoutId = setTimeout(() => {
      if (!cancelled) task(sink, ...args)
    }, delay)

    return disposeWith(() => {
      cancelled = true
      clearTimeout(timeoutId)
    })
  }

  asap<T, TArgs extends Args>(sink: ISink<T>, task: ITask<T, TArgs>, ...args: TArgs): Disposable {
    const taskItem: Task = {
      sink,
      task,
      args,
      cancelled: false
    }

    this.computeQueue.push(taskItem)
    this.scheduleCompute()

    return disposeWith(() => {
      taskItem.cancelled = true
    })
  }

  paint<T, TArgs extends readonly unknown[]>(sink: ISink<T>, task: ITask<T, TArgs>, ...args: TArgs): Disposable {
    const taskItem: Task = {
      sink,
      task,
      args,
      cancelled: false
    }

    this.renderQueue.push(taskItem)
    this.scheduleRender()

    return disposeWith(() => {
      taskItem.cancelled = true
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

    // Use for loop for better performance
    for (let i = 0; i < len; i++) {
      const task = queue[i]
      if (!task.cancelled) {
        this.executeTask(task.task, task.sink, task.args)
      }
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

    // Use for loop for better performance
    for (let i = 0; i < len; i++) {
      const task = queue[i]
      if (!task.cancelled) {
        this.executeTask(task.task, task.sink, task.args)
      }
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
