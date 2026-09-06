import { propagateRunTask } from '../scheduler/PropagateTask.js'
import type { IScheduler, ISink, IStream, ITime } from '../types.js'
import { tryEvent } from '../utils/sink.js'

/**
 * Emits the current time after a delay, then ends
 *
 * wait(3):   ---3|
 * wait(0):   0|
 * wait(5):   -----5|
 */
export const wait = (delay: ITime): IStream<ITime> => new Wait(delay)

class Wait implements IStream<ITime> {
  constructor(readonly delay: ITime) {}

  run(sink: ISink<ITime>, scheduler: IScheduler): Disposable {
    const task = propagateRunTask(sink, emitTime)
    return this.delay > 0 ? scheduler.delay(task, this.delay) : scheduler.asap(task)
  }
}

export function emitTime(time: ITime, sink: ISink<ITime>) {
  tryEvent(sink, time, time)
  sink.end(time)
}
