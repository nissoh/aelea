import { stream } from '../stream.js'
import type { ISink, IStream } from '../types.js'
import { disposeNone } from '../utils/disposable.js'

export const fromArray = <T>(arr: readonly T[]): IStream<T> =>
  stream((scheduler, sink) => scheduler.asap(emitArray, sink, arr))

export const now = <A>(value: A): IStream<A> => stream((scheduler, sink) => scheduler.asap(eventNow, sink, value))

export const never: IStream<never> = stream(() => disposeNone)

export const empty: IStream<never> = stream((scheduler, sink) => scheduler.asap(emitEmpty, sink))

function eventNow<T>(sink: ISink<T>, value: T) {
  sink.event(value)
  sink.end()
}

function emitArray<T>(sink: ISink<T>, arr: readonly any[]): void {
  for (const a of arr) {
    sink.event(a)
  }
  sink.end()
}

function emitEmpty(sink: any): void {
  sink.end()
}
