import type { IScheduler, ITask } from '../types.js'

export class ScheduledTask implements ITask {
  active = true

  constructor(
    readonly scheduler: IScheduler,
    readonly task: ITask,
    readonly time: number,
    readonly localOffset: number = 0
  ) {}

  run(): void {
    if (this.active) {
      this.task.run()
    }
  }

  [Symbol.dispose](): void {
    this.active = false
    this.task[Symbol.dispose]()
  }
}
