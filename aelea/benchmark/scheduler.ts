import type { IScheduler } from '../src/stream/types.js'
import { disposeWith } from '../src/stream/utils/disposable.js'

// High-performance scheduler using function queues for benchmarking
class BatchScheduler implements IScheduler {
  private queue: Array<() => void> = []
  private scheduled = false

  asap<TArgs extends readonly unknown[], T>(sink: any, callback: (sink: any, ...args: TArgs) => void, ...args: TArgs) {
    let cancelled = false

    // Create optimized closure based on argument count
    let fn: () => void
    const len = args.length

    if (len === 0) {
      fn = () => {
        if (!cancelled) callback(sink)
      }
    } else if (len === 1) {
      const arg0 = args[0]
      fn = () => {
        if (!cancelled) callback(sink, arg0)
      }
    } else if (len === 2) {
      const arg0 = args[0]
      const arg1 = args[1]
      fn = () => {
        if (!cancelled) callback(sink, arg0, arg1)
      }
    } else if (len === 3) {
      const arg0 = args[0]
      const arg1 = args[1]
      const arg2 = args[2]
      fn = () => {
        if (!cancelled) callback(sink, arg0, arg1, arg2)
      }
    } else {
      fn = () => {
        if (!cancelled) callback(sink, ...args)
      }
    }

    this.queue.push(fn)

    if (!this.scheduled) {
      this.scheduled = true
      queueMicrotask(() => this.flush())
    }

    return disposeWith(() => {
      cancelled = true
    })
  }

  private flush() {
    // Process entire queue in one batch
    const tasks = this.queue
    const len = tasks.length
    this.queue = []
    this.scheduled = false

    // Direct function execution - maximum performance
    for (let i = 0; i < len; i++) {
      tasks[i]()
    }
  }

  delay<TArgs extends readonly unknown[], T>(
    sink: any,
    callback: (sink: any, ...args: TArgs) => void,
    delay: number,
    ...args: TArgs
  ) {
    const id = setTimeout(() => callback(sink, ...args), delay)
    return disposeWith(clearTimeout, id)
  }

  time() {
    return performance.now()
  }
}

// Export singleton instance for benchmarking
export const scheduller: IScheduler = new BatchScheduler()
