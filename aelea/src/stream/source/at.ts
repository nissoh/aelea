import { stream } from '../stream.js'
import type { IStream, Sink } from '../types.js'
import { curry2 } from '../utils/function.js'

export const at: IAtCurry = curry2((delay, value) =>
  stream((scheduler, sink) => scheduler.delay(sink, atOnce, delay, value))
)

function atOnce<T>(sink: Sink<T>, value: T) {
  sink.event(value)
  sink.end()
}

export interface IAtCurry {
  <T>(delay: number, value: T): IStream<T>
  <T>(delay: number): (value: T) => IStream<T>
}
