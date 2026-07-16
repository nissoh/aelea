import type { ITask, ITime } from '../types.js'

export function runTaskGuarded(task: ITask, time: ITime): void {
  try {
    task.run(time)
  } catch (err) {
    try {
      task.error(time, err)
    } catch (err2) {
      queueMicrotask(() => {
        throw err2
      })
    }
  }
}
