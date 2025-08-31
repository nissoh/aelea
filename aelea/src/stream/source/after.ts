import { propagateRunEventTask } from '../scheduler/PropagateTask.js'
import type { IScheduler, ISink, IStream, Time } from '../types.js'

/**
 * Emits a single value after a delay, then ends
 *
 * after(3, 'a'):   ---a|
 * after(0, 'b'):   b|
 * after(5, 'c'):   -----c|
 */
export const after = <T>(delay: Time, value: T): IStream<T> => new After(delay, value)

/**
 * Computes and emits a value after a delay, then ends
 *
 * afterWith(3, t => t):      ---3|
 * afterWith(0, t => t*2):    0|
 * afterWith(5, t => `${t}`): -----"5"|
 */
export const afterWith = <T>(delay: Time, f: (time: Time) => T): IStream<T> => new AfterWith(delay, f)

class After<T> implements IStream<T> {
  constructor(
    readonly delay: Time,
    readonly value: T
  ) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    const task = propagateRunEventTask(sink, emit, this.value)
    return this.delay > 0 ? scheduler.delay(task, this.delay) : scheduler.asap(task)
  }
}

class AfterWith<T> implements IStream<T> {
  constructor(
    readonly delay: Time,
    readonly f: (time: Time) => T
  ) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    const task = propagateRunEventTask(sink, emitWith, this.f)
    return this.delay > 0 ? scheduler.delay(task, this.delay) : scheduler.asap(task)
  }
}

function emit<T>(time: Time, sink: ISink<T>, value: T) {
  sink.event(time, value)
  sink.end(time)
}

function emitWith<T>(time: Time, sink: ISink<T>, f: (time: Time) => T) {
  try {
    sink.event(time, f(time))
  } catch (e) {
    sink.error(time, e)
  }
  sink.end(time)
}
