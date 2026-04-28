import type { IScheduler, ITask, ITime } from '../types.js'

// Minimal Node.js globals used by this scheduler, declared locally so @types/node
// is not a required dependency.
declare const setImmediate: (fn: (...args: unknown[]) => void, ...args: unknown[]) => ImmediateHandle
declare const clearImmediate: (handle: ImmediateHandle) => void
type ImmediateHandle = { readonly __immediate: true }

/**
 * Node.js optimized scheduler implementation.
 *
 * Uses setImmediate for asap tasks. setImmediate fires in Node's "check"
 * phase, AFTER the "timers" phase — so a setTimeout(0) callback can fire
 * before a pending setImmediate. To preserve "asap before delay" ordering,
 * the timer callback first cancels and flushes any pending setImmediate.
 *
 * Implementation notes (metal):
 *  - asapTasks array is recycled across flushes to avoid per-flush
 *    allocation under high-frequency scheduling.
 *  - All tasks within a single flush share one logical timestamp so that
 *    "events scheduled in the same tick" agree on time().
 */
export class NodeScheduler implements IScheduler {
  private asapTasks: ITask[] = []
  private asapImmediate: ImmediateHandle | null = null
  // One-slot free list for the previously-flushed array.
  private recycled: ITask[] | null = null
  private readonly initialTime = performance.now()
  private readonly initialWallClockTime = Date.now()

  asap(task: ITask): Disposable {
    this.asapTasks.push(task)

    if (!this.asapImmediate) {
      this.asapImmediate = setImmediate(this.flushAsapTasks)
    }

    return task
  }

  delay(task: ITask, delay: ITime): Disposable {
    setTimeout(this.runDelayedTask, delay, task)
    return task
  }

  flushAsapTasks = (): void => {
    this.asapImmediate = null
    const tasks = this.asapTasks
    // Fast path: single-task flush (common case for one-shot pipelines).
    if (tasks.length === 1) {
      const task = tasks[0]
      tasks.length = 0
      task.run(this.time())
      return
    }
    this.asapTasks = this.recycled ?? []
    this.recycled = null
    const time = this.time()
    for (let i = 0; i < tasks.length; i++) tasks[i].run(time)
    tasks.length = 0
    this.recycled = tasks
  }

  runDelayedTask = (task: ITask): void => {
    // Drain any pending setImmediate first to keep "asap before delay"
    // ordering on Node, where the timers phase precedes the check phase.
    if (this.asapImmediate) {
      clearImmediate(this.asapImmediate)
      this.flushAsapTasks()
    }
    task.run(this.time())
  }

  time(): ITime {
    return performance.now() - this.initialTime
  }

  dayTime(): ITime {
    return this.initialWallClockTime + this.time()
  }
}

export function createNodeScheduler(): IScheduler {
  return new NodeScheduler()
}
