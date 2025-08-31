import { propagateRunTask } from '../scheduler/PropagateTask.js'
import type { IScheduler, ISink, IStream, Time } from '../types.js'

/**
 * Emits the current time after a delay, then ends
 *
 * wait(3):   ---3|
 * wait(0):   0|
 * wait(5):   -----5|
 */
export const wait = (delay: Time): IStream<Time> => new Wait(delay)

class Wait implements IStream<Time> {
  constructor(readonly delay: Time) {}

  run(sink: ISink<Time>, scheduler: IScheduler): Disposable {
    const task = propagateRunTask(sink, emit)
    return this.delay > 0 ? scheduler.delay(task, this.delay) : scheduler.asap(task)
  }
}

function emit(time: Time, sink: ISink<Time>) {
  sink.event(time, time)
  sink.end(time)
}
