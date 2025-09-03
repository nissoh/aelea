import type { IScheduler, ITask, ITime } from '../types.js'

/**
 * Node.js optimized scheduler implementation
 *
 * Uses setImmediate for asap tasks and maintains its own clock starting from instantiation.
 * Each scheduler instance tracks time from 0, independent of when it was created.
 */

export class NodeScheduler implements IScheduler {
  private asapTasks: ITask[] = []
  private asapImmediate: NodeJS.Immediate | null = null
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
    this.asapTasks = []

    for (let i = 0; i < tasks.length; i++) tasks[i].run(this.time())
  }

  runDelayedTask = (task: ITask): void => {
    // First flush any pending asap tasks
    if (this.asapImmediate) {
      // Cancel the pending setImmediate to avoid duplicate execution
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
