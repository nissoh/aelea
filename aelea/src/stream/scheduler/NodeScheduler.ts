import type { IScheduler, ITask, Time } from '../types.js'

/**
 * Node.js optimized scheduler implementation
 *
 * Uses setImmediate for asap tasks and maintains its own clock starting from instantiation.
 * Each scheduler instance tracks time from 0, independent of when it was created.
 */

export class NodeScheduler implements IScheduler {
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
      setImmediate(this.flushAsapTasks)
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

export function createNodeScheduler(): IScheduler {
  return new NodeScheduler()
}
