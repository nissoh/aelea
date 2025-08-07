import { propagateEndTask, propagateRunEventTask } from '../scheduler/PropagateTask.js'
import { stream } from '../stream.js'
import type { ISink, IStream } from '../types.js'
import { disposeNone } from '../utils/disposable.js'

export const fromArray = <T>(arr: readonly T[]): IStream<T> =>
  stream((sink, scheduler) => scheduler.asap(propagateRunEventTask(sink, scheduler, emitArray, arr)))

export const now = <A>(value: A): IStream<A> =>
  stream((sink, scheduler) => scheduler.asap(propagateRunEventTask(sink, scheduler, emitNow, value)))

export const never: IStream<never> = stream(() => disposeNone)

export const empty: IStream<never> = stream((sink, scheduler) => scheduler.asap(propagateEndTask(sink, scheduler)))

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
