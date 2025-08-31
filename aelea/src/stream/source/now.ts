import { propagateRunTask } from '../scheduler/PropagateTask.js'
import type { IScheduler, ISink, IStream, Time } from '../types.js'

class Now implements IStream<Time> {
  run(sink: ISink<Time>, scheduler: IScheduler): Disposable {
    return scheduler.asap(propagateRunTask(sink, emit))
  }
}

/**
 * Emits the current time immediately, then ends
 *
 * now:  0|
 */
export const now: IStream<Time> = new Now()

function emit(time: Time, sink: ISink<Time>) {
  sink.event(time, time)
  sink.end(time)
}
