import { propagateRunEventTask } from '../scheduler/PropagateTask.js'
import type { IScheduler, ISink, IStream, Time } from '../types.js'

/**
 * Emit a single value computed from time, then end
 *
 * nowWith(t => t + 100): (currentTime+100)|
 */
export const nowWith = <T>(fn: (time: Time) => T): IStream<T> => new NowWith(fn)

class NowWith<T> implements IStream<T> {
  constructor(private fn: (time: Time) => T) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    return scheduler.asap(propagateRunEventTask(sink, emitNowWith, this.fn))
  }
}

function emitNowWith<T>(time: Time, sink: ISink<T>, fn: (time: Time) => T) {
  sink.event(time, fn(time))
  sink.end(time)
}
