import { propagateRunEventTask } from '../scheduler/PropagateTask.js'
import type { IScheduler, ISink, IStream, Time } from '../types.js'

/**
 * Creates a stream from any iterable (arrays, Sets, Maps, generators, etc.)
 *
 * iterate([1,2,3]):     123|
 * iterate(new Set([1,2])): 12|
 * iterate(generator()):    ...values...|
 */
export const iterate = <T>(iterable: Iterable<T>): IStream<T> => new Iterate(iterable)

class Iterate<T> implements IStream<T> {
  constructor(readonly iterable: Iterable<T>) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    return scheduler.asap(propagateRunEventTask(sink, emitIterable, this.iterable))
  }
}

function emitIterable<T>(time: Time, sink: ISink<T>, iterable: Iterable<T>): void {
  for (const value of iterable) {
    sink.event(time, value)
  }
  sink.end(time)
}
