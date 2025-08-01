import { curry2 } from '../function.js'
import type { IStream, Sink } from '../types.js'

export interface IAtCurry {
  <T>(delay: number, value: T): IStream<T>
  <T>(delay: number): (value: T) => IStream<T>
}

export const at: IAtCurry = curry2((delay, value) => ({
  run(scheduler, sink) {
    return scheduler.delay(sink, atOnce, delay, value)
  }
}))

function atOnce<T>(sink: Sink<T>, value: T) {
  sink.event(value)
  sink.end()
}
