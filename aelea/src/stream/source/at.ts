import { propagateEndTask, propagateRunTask } from '../scheduler/PropagateTask.js'
import type { IScheduler, ISink, IStream, Time } from '../types.js'

/**
 * Emits the time value at a specific absolute time, then ends
 * Skips emission if the target time has already passed
 *
 * at(3) when current=1:  --3|   (waits 2 units)
 * at(3) when current=5:  |      (time passed, ends immediately)
 * at(0):                 0|     (emits immediately)
 */
export const at = (time: Time): IStream<Time> => new At(time)

class At implements IStream<Time> {
  constructor(readonly time: Time) {}

  run(sink: ISink<Time>, scheduler: IScheduler): Disposable {
    const currentTime = scheduler.time()
    const delay = Math.max(0, this.time - currentTime)

    return delay > 0 ? scheduler.delay(propagateRunTask(sink, emit), delay) : scheduler.asap(propagateEndTask(sink))
  }
}

function emit(time: Time, sink: ISink<Time>) {
  sink.event(time, time)
  sink.end(time)
}
