import { propagateEndTask, propagateRunEventTask } from '../scheduler/PropagateTask.js'
import type { IScheduler, ISink, IStream } from '../types.js'
import { disposeNone } from '../utils/disposable.js'

export const nowWith = <T>(f: (time: number) => T): IStream<T> => new AtWith(0, f)
export const now = <A>(value: A): IStream<A> => new At(0, value)
export const never: IStream<never> = {
  run(_: ISink<never>, __: IScheduler): Disposable {
    return disposeNone
  }
}
export const empty: IStream<never> = {
  run(sink: ISink<never>, scheduler: IScheduler): Disposable {
    return scheduler.asap(propagateEndTask(sink))
  }
}
export const at = <T>(delay: number, value: T): IStream<T> => new At(delay, value)
export const atWith = <T>(delay: number, f: (time: number) => T): IStream<T> => new AtWith(delay, f)

class At<T> implements IStream<T> {
  constructor(
    readonly delay: number,
    readonly value: T
  ) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    const task = propagateRunEventTask(sink, emit, this.value)
    return this.delay > 0 ? scheduler.delay(task, this.delay) : scheduler.asap(task)
  }
}

class AtWith<T> implements IStream<T> {
  constructor(
    readonly delay: number,
    readonly f: (time: number) => T
  ) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    return scheduler.delay(propagateRunEventTask(sink, emitWith, this.f), this.delay)
  }
}

function emit<T>(time: number, sink: ISink<T>, value: T) {
  sink.event(time, value)
  sink.end(time)
}

function emitWith<T>(time: number, sink: ISink<T>, f: (time: number) => T) {
  try {
    sink.event(time, f(time))
  } catch (e) {
    sink.error(time, e)
  }
  sink.end(time)
}
