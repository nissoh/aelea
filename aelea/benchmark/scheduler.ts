import type { IScheduler } from '../src/stream/types.js'
import { disposeWith } from '../src/stream/utils/disposable.js'

// High-performance scheduler using closures with optimized batching
class BatchScheduler implements IScheduler {
  // Pre-allocated task array with power of 2 size for fast modulo
  private static readonly BUFFER_SIZE = 8192
  private static readonly MASK = 8191

  private tasks: Array<(() => void) | null> = new Array(BatchScheduler.BUFFER_SIZE)
  private head = 0
  private tail = 0
  private scheduled = false

  asap(sink, task, ...args) {
    let cancelled = false

    // Fast ring buffer enqueue
    this.tasks[this.tail] = () => cancelled || task(sink, ...args)
    this.tail = (this.tail + 1) & BatchScheduler.MASK

    if (!this.scheduled) {
      this.scheduled = true
      queueMicrotask(() => this.flush())
    }

    return disposeWith(() => {
      cancelled = true
    })
  }

  private flush() {
    this.scheduled = false

    // Cache for faster access
    const tasks = this.tasks
    const mask = BatchScheduler.MASK
    let head = this.head
    const tail = this.tail

    // Tight execution loop
    while (head !== tail) {
      const task = tasks[head]
      tasks[head] = null // Clear reference to allow GC
      task!() // Non-null assertion - we know task exists here
      head = (head + 1) & mask
    }

    this.head = head
  }

  delay(sink, task, delay, ...args) {
    const id = setTimeout(task, delay, sink, ...args)
    return disposeWith(clearTimeout, id)
  }

  time() {
    return performance.now()
  }
}

// Export singleton instance for benchmarking
export const scheduler: IScheduler = new BatchScheduler()
