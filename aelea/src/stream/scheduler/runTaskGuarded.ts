import type { ITask, ITime } from '../types.js'
import { reportUncaught } from '../utils/sink.js'

export function runTaskGuarded(task: ITask, time: ITime): boolean {
  try {
    task.run(time)
    return true
  } catch (err) {
    try {
      task.error(time, err)
    } catch (fault) {
      reportUncaught(fault)
    }
    return false
  }
}
