import { stream } from '../stream.js'
import type { ISink, IStream } from '../types.js'
import { disposeNone } from '../utils/disposable.js'

export const fromArray = <T>(arr: readonly T[]): IStream<T> =>
  stream((sink, scheduler) => scheduler.asap(emitArray, arr, sink))

export const now = <A>(value: A): IStream<A> => stream((sink, scheduler) => scheduler.asap(eventNow, value, sink))

export const never: IStream<never> = stream(() => disposeNone)

export const empty: IStream<never> = stream((sink, scheduler) => scheduler.asap(emitEmpty, sink))

function eventNow<T>(value: T, sink: ISink<T>) {
  sink.event(value)
  sink.end()
}

function emitArray<T>(arr: readonly any[], sink: ISink<T>): void {
  for (const a of arr) {
    sink.event(a)
  }
  sink.end()
}

function emitEmpty(sink: any): void {
  sink.end()
}
