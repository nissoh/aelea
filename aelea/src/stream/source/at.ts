import { curry2 } from '../function.js'
import type { IStream } from '../types.js'

export interface IAtCurry {
  <T>(delay: number, value: T): IStream<T>
  <T>(delay: number): (value: T) => IStream<T>
}

export const at: IAtCurry = curry2((delay, value) => ({
  run(scheduler, sink) {
    return scheduler.schedule(() => {
      sink.event(value)
      sink.end()
    }, delay)
  }
}))
