import { stream } from '../stream.js'
import type { ISink, IStream } from '../types.js'
import { disposeNone } from '../utils/disposable.js'

export const fromArray = <T>(arr: readonly T[]): IStream<T> =>
  stream((sink, scheduler) => scheduler.asap(emitArray, sink, arr))

export const now = <A>(value: A): IStream<A> => stream((sink, scheduler) => scheduler.asap(emitNow, sink, value))

export const never: IStream<never> = stream(() => disposeNone)

export const empty: IStream<never> = stream((sink, scheduler) => scheduler.asap(emitEmpty, sink))

function emitNow<T>(sink: ISink<T>, value: T) {
  sink.event(value)
  sink.end()
}

function emitArray<T>(sink: ISink<T>, arr: readonly any[]): void {
  for (const a of arr) {
    sink.event(a)
  }
  sink.end()
}

function emitEmpty(sink: ISink<any>): void {
  sink.end()
}
