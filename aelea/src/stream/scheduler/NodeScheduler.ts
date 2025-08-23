import type { IScheduler, ITask } from '../types.js'
import { runTask } from './PropagateTask.js'

/**
 * Node.js optimized scheduler implementation
 *
 * Uses Node.js specific APIs for better performance:
 * - setImmediate for asap tasks (more efficient than queueMicrotask in Node.js)
 * - process.hrtime for high-resolution time
 *
 * This scheduler is optimized for server-side stream processing where:
 * - High throughput is critical
 * - DOM operations are not needed
 * - CPU-bound tasks are common
 */

export class NodeScheduler implements IScheduler {
  // Task queues to avoid closures
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
      setImmediate(this.flushAsapTasks)
    }

    return task
  }

  delay(task: ITask, delay: number): Disposable {
    setTimeout(runTask, delay, task)
    return task
  }

  time(): number {
    // Use performance.now() for consistency with browser scheduler
    // It's available in Node.js and provides monotonic time
    return performance.now()
  }
}

export function createNodeScheduler(): IScheduler {
  return new NodeScheduler()
}
