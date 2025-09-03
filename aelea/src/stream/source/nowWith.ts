import { propagateRunEventTask } from '../scheduler/PropagateTask.js'
import type { IScheduler, ISink, IStream, ITime } from '../types.js'

/**
 * Emit a single value computed from time, then end
 *
 * nowWith(t => t + 100): (currentTime+100)|
 */
export const nowWith = <T>(fn: (time: ITime) => T): IStream<T> => new NowWith(fn)

class NowWith<T> implements IStream<T> {
  constructor(private fn: (time: ITime) => T) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    return scheduler.asap(propagateRunEventTask(sink, emitNowWith, this.fn))
  }
}

function emitNowWith<T>(time: ITime, sink: ISink<T>, fn: (time: ITime) => T) {
  try {
    sink.event(time, fn(time))
  } catch (err) {
    sink.error(time, err)
  }
  sink.end(time)
}
