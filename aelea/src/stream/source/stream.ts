import { propagateRunEventTask } from '../scheduler/PropagateTask.js'
import type { IScheduler, ISink, IStream, Time } from '../types.js'

export { at, atWith } from './at.js'
export { empty, never } from './void.js'

/**
 * Computes and emits a value immediately using function f, then ends
 * 
 * nowWith(t => t):     0|
 * nowWith(t => t*2):   0|
 * nowWith(t => 'hi'):  "hi"|
 */
export const nowWith = <T>(f: (time: Time) => T): IStream<T> => new NowWith(f)

/**
 * Emits a value immediately, then ends
 * 
 * now('a'):  a|
 * now(42):   42|
 * now(true): true|
 */
export const now = <A>(value: A): IStream<A> => new Now(value)

class Now<T> implements IStream<T> {
  constructor(readonly value: T) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    return scheduler.asap(propagateRunEventTask(sink, emitNow, this.value))
  }
}

class NowWith<T> implements IStream<T> {
  constructor(private f: (time: Time) => T) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    return scheduler.asap(propagateRunEventTask(sink, emitNowWith, this.f))
  }
}

function emitNow<T>(time: Time, sink: ISink<T>, value: T) {
  sink.event(time, value)
  sink.end(time)
}

function emitNowWith<T>(time: Time, sink: ISink<T>, f: (time: Time) => T) {
  try {
    sink.event(time, f(time))
  } catch (e) {
    sink.error(time, e)
  }
  sink.end(time)
}
