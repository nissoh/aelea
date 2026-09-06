import type { ITask, ITime } from '../types.js'
import { reportUncaught } from '../utils/sink.js'

export function runTaskGuarded(task: ITask, time: ITime): void {
  try {
    task.run(time)
  } catch (err) {
    try {
      task.error(time, err)
    } catch (fault) {
      reportUncaught(fault)
    }
  }
}
