import { stream } from '../stream.js'
import type { IStream, Sink } from '../types.js'
import { curry2 } from '../utils/function.js'
import { PipeSink } from '../utils/sink.js'

export const skipRepeats = <T>(stream: IStream<T>): IStream<T> => skipRepeatsWith<T>((a, b) => a === b)(stream)

export const skipRepeatsWith: ISkipRepeatsWithCurry = curry2((equals, source) =>
  stream((scheduler, sink) => source.run(scheduler, new SkipRepeatsSink(equals, sink)))
)

export interface ISkipRepeatsWithCurry {
  <T>(equals: (a: T, b: T) => boolean, source: IStream<T>): IStream<T>
  <T>(equals: (a: T, b: T) => boolean): (source: IStream<T>) => IStream<T>
}

class SkipRepeatsSink<T> extends PipeSink<T> {
  private hasValue = false
  private previousValue!: T

  constructor(
    private readonly equals: (a: T, b: T) => boolean,
    sink: Sink<T>
  ) {
    super(sink)
  }

  event(value: T) {
    if (!this.hasValue || !this.equals(this.previousValue, value)) {
      this.hasValue = true
      this.previousValue = value
      this.sink.event(value)
    }
  }
}
