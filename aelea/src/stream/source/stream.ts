import { propagateEndTask, propagateRunEventTask } from '../scheduler/PropagateTask.js'
import type { IScheduler, ISink, IStream } from '../types.js'
import { disposeNone } from '../utils/disposable.js'

export const fromArray = <T>(arr: readonly T[]): IStream<T> => new FromArray(arr)
export const nowWith = <T>(f: (time: number) => T): IStream<T> => new NowWith(f)
export const now = <A>(value: A): IStream<A> => new Now(value)
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

class Now<T> implements IStream<T> {
  constructor(readonly value: T) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    return scheduler.asap(propagateRunEventTask(sink, emitNow, this.value))
  }
}

class NowWith<T> implements IStream<T> {
  constructor(private f: (time: number) => T) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    return scheduler.asap(propagateRunEventTask(sink, emitNowWith, this.f))
  }
}

class FromArray<T> implements IStream<T> {
  constructor(readonly arr: readonly T[]) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    return scheduler.asap(propagateRunEventTask(sink, emitArray, this.arr))
  }
}

function emitNow<T>(time: number, sink: ISink<T>, value: T) {
  sink.event(time, value)
  sink.end(time)
}

function emitNowWith<T>(time: number, sink: ISink<T>, f: (time: number) => T) {
  try {
    sink.event(time, f(time))
  } catch (e) {
    sink.error(time, e)
  }
  sink.end(time)
}

function emitArray<T extends readonly unknown[]>(time: number, sink: ISink<T[number]>, arr: T): void {
  for (const a of arr) {
    sink.event(time, a)
  }
  sink.end(time)
}
