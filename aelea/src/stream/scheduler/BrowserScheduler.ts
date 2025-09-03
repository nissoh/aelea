import type { IScheduler, ITask, ITime } from '../types.js'

/**
 * Browser-optimized scheduler implementation
 *
 * Uses queueMicrotask for asap tasks and maintains its own clock starting from instantiation.
 * Each scheduler instance tracks time from 0, independent of when it was created.
 */

export class BrowserScheduler implements IScheduler {
  private asapTasks: ITask[] = []
  private asapScheduled = false
  private asapCancelled = false
  private readonly initialTime = performance.now()
  private readonly initialWallClockTime = Date.now()

  runDelayedTask = (task: ITask): void => {
    // First flush any pending asap tasks
    if (this.asapScheduled) {
      // Mark the pending microtask as cancelled
      this.asapCancelled = true
      this.flushAsapTasks()
    }
    task.run(this.time())
  }

  flushAsapTasks = (): void => {
    // Check if this flush was cancelled
    if (this.asapCancelled) {
      this.asapCancelled = false
      return
    }
    this.asapScheduled = false
    const tasks = this.asapTasks
    this.asapTasks = []

    for (let i = 0; i < tasks.length; i++) tasks[i].run(this.time())
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
