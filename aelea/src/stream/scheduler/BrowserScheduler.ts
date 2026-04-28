import type { IScheduler, ITask, ITime } from '../types.js'

/**
 * Browser-optimized scheduler implementation.
 *
 * Uses queueMicrotask for asap tasks and maintains its own clock starting
 * from instantiation. Each scheduler instance tracks time from 0,
 * independent of when it was created.
 */
export class BrowserScheduler implements IScheduler {
  private asapTasks: ITask[] = []
  private asapScheduled = false
  // One-slot free list: holds the previously-flushed array so the next
  // flush can reuse it instead of allocating fresh.
  private recycled: ITask[] | null = null
  private readonly initialTime = performance.now()
  private readonly initialWallClockTime = Date.now()

  runDelayedTask = (task: ITask): void => {
    task.run(this.time())
  }

  flushAsapTasks = (): void => {
    this.asapScheduled = false
    const tasks = this.asapTasks
    // Fast path: single-task flush (the common case for one-shot pipelines).
    // Skip the recycled-array shuffle entirely. Clear length BEFORE running
    // so a re-asap during run() lands in this same array but is queued for
    // the NEXT microtask (asapScheduled is already false → fresh schedule).
    if (tasks.length === 1) {
      const task = tasks[0]
      tasks.length = 0
      task.run(this.time())
      return
    }
    // Multi-task path: swap in a recycled empty array so re-asaps during
    // the loop are queued to the next tick (preserving prior semantics).
    this.asapTasks = this.recycled ?? []
    this.recycled = null
    const time = this.time()
    for (let i = 0; i < tasks.length; i++) tasks[i].run(time)
    tasks.length = 0
    this.recycled = tasks
  }

  asap(task: ITask): Disposable {
    this.asapTasks.push(task)

    if (!this.asapScheduled) {
      this.asapScheduled = true
      queueMicrotask(this.flushAsapTasks)
    }

    return task
  }

  delay(task: ITask, delay: ITime): Disposable {
    setTimeout(this.runDelayedTask, delay, task)
    return task
  }

  time(): ITime {
    return performance.now() - this.initialTime
  }

  dayTime(): ITime {
    return this.initialWallClockTime + this.time()
  }
}

export function createBrowserScheduler(): IScheduler {
  return new BrowserScheduler()
}
