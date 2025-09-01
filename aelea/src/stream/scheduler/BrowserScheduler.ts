import type { IScheduler, ITask, Time } from '../types.js'

/**
 * Browser-optimized scheduler implementation
 *
 * Uses queueMicrotask for asap tasks and maintains its own clock starting from instantiation.
 * Each scheduler instance tracks time from 0, independent of when it was created.
 */

export class BrowserScheduler implements IScheduler {
  private asapTasks: ITask[] = []
  private asapScheduled = false
  private readonly startTime = performance.now()

  runDelayedTask = (task: ITask): void => {
    task.run(this.time())
  }

  flushAsapTasks = (): void => {
    this.asapScheduled = false
    const tasks = this.asapTasks
    this.asapTasks = []
    const time = this.time()

    for (const task of tasks) task.run(time)
  }

  asap(task: ITask): Disposable {
    this.asapTasks.push(task)

    if (!this.asapScheduled) {
      this.asapScheduled = true
      queueMicrotask(this.flushAsapTasks)
    }

    return task
  }

  delay(task: ITask, delay: Time): Disposable {
    setTimeout(this.runDelayedTask, delay, task)
    return task
  }

  time(): Time {
    return performance.now() - this.startTime
  }
}

export function createBrowserScheduler(): IScheduler {
  return new BrowserScheduler()
}
