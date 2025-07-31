import { curry2 } from '../function.js'
import { TransformSink } from '../sink.js'
import type { IStream, Sink } from '../types.js'

/**
 * Skip consecutive duplicate values using === equality
 */
export const skipRepeats =
  <T>() =>
  (stream: IStream<T>): IStream<T> =>
    skipRepeatsWith<T>((a, b) => a === b)(stream)

export interface ISkipRepeatsWithCurry {
  <T>(equals: (a: T, b: T) => boolean, source: IStream<T>): IStream<T>
  <T>(equals: (a: T, b: T) => boolean): (source: IStream<T>) => IStream<T>
}

/**
 * Skip consecutive duplicate values using custom equality function
 */
export const skipRepeatsWith: ISkipRepeatsWithCurry = curry2((equals, source) => ({
  run(scheduler, sink) {
    return source.run(scheduler, new SkipRepeatsSink(equals, sink))
  }
}))

class SkipRepeatsSink<T> extends TransformSink<T, T> {
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
      this.tryEvent(() => this.sink.event(value))
    }
  }
}
