import { stream } from '../stream.js'
import type { ISink, IStream } from '../types.js'
import { curry2 } from '../utils/function.js'
import { PipeSink } from '../utils/sink.js'

/**
 * Skip the first n values from a stream
 *
 * stream:   -1-2-3-4-5-6->
 * skip(3):  -------4-5-6->
 */
export const skip: ISkipCurry = curry2((n, source) =>
  stream((sink, scheduler) => source.run(new SkipSink(n, sink), scheduler))
)

export interface ISkipCurry {
  <T>(n: number, source: IStream<T>): IStream<T>
  <T>(n: number): (source: IStream<T>) => IStream<T>
}

class SkipSink<T> extends PipeSink<T> {
  skipped = 0

  constructor(
    readonly n: number,
    sink: ISink<T>
  ) {
    super(sink)
  }

  event(value: T): void {
    if (this.skipped < this.n) {
      this.skipped++
    } else {
      this.sink.event(value)
    }
  }
}
