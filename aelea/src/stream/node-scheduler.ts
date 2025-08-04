import type { IScheduler, ITask } from './types.js'

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
  asap = setImmediate

  delay<TArgs extends readonly unknown[]>(task: ITask<TArgs>, delay: number, ...args: TArgs): Disposable {
    // Direct pass-through to setTimeout, leveraging Node.js Timeout's dispose
    return setTimeout(task, delay, ...args) as unknown as Disposable
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
