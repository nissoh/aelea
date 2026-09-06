import { propagateRunEventTask } from '../scheduler/PropagateTask.js'
import type { IScheduler, ISink, IStream, ITime } from '../types.js'
import { tryEvent } from '../utils/sink.js'

/**
 * Emits a single value immediately, then ends
 *
 * just('a'):  a|
 * just(42):   42|
 * just(true): true|
 */
export const just = <T>(value: T): IStream<T> => new Just(value)

class Just<T> implements IStream<T> {
  constructor(readonly value: T) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    return scheduler.asap(propagateRunEventTask(sink, emit, this.value))
  }
}

function emit<T>(time: ITime, sink: ISink<T>, value: T) {
  tryEvent(sink, time, value)
  sink.end(time)
}
