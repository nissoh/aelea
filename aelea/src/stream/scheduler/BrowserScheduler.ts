import type { IScheduler, ITask } from '../types.js'
import { runTask } from './PropagateTask.js'

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
  asapTasks: ITask[] = []
  asapScheduled = false

  flushAsapTasks = (): void => {
    this.asapScheduled = false
    const tasks = this.asapTasks
    this.asapTasks = []

    for (const task of tasks) task.run()
  }

  asap(task: ITask): Disposable {
    this.asapTasks.push(task)

    if (!this.asapScheduled) {
      this.asapScheduled = true
      queueMicrotask(this.flushAsapTasks)
    }

    return task
  }

  delay(task: ITask, delay: number): Disposable {
    setTimeout(runTask, delay, task)
    return task
  }

  time(): number {
    return performance.now()
  }
}

export function createBrowserScheduler(): IScheduler {
  return new BrowserScheduler()
}
