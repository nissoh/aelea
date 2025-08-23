import { propagateEndTask, propagateRunEventTask } from '../scheduler/PropagateTask.js'
import type { IScheduler, ISink, IStream } from '../types.js'
import { disposeNone } from '../utils/disposable.js'

/**
 * Stream that emits all values from an array and then ends
 */
class FromArray<T> implements IStream<T> {
  constructor(readonly arr: readonly T[]) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    return scheduler.asap(propagateRunEventTask(sink, emitArray, this.arr))
  }
}

/**
 * Stream that emits a single value immediately and then ends
 */
class Now<T> implements IStream<T> {
  constructor(readonly value: T) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    return scheduler.asap(propagateRunEventTask(sink, emitNow, this.value))
  }
}

/**
 * Stream that never emits any values and never ends
 */
class Never implements IStream<never> {
  run(): Disposable {
    return disposeNone
  }
}

/**
 * Stream that immediately ends without emitting any values
 */
class Empty implements IStream<never> {
  run(sink: ISink<never>, scheduler: IScheduler): Disposable {
    return scheduler.asap(propagateEndTask(sink))
  }
}

export const fromArray = <T>(arr: readonly T[]): IStream<T> => new FromArray(arr)

export const now = <A>(value: A): IStream<A> => new Now(value)

export const never: IStream<never> = new Never()

export const empty: IStream<never> = new Empty()

function emitNow<T>(sink: ISink<T>, value: T) {
  sink.event(value)
  sink.end()
}

function emitArray<T extends readonly unknown[]>(sink: ISink<T[number]>, arr: T): void {
  for (const a of arr) {
    sink.event(a)
  }
  sink.end()
}
