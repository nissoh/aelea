import { curry2 } from '../function.js'
import { PipeSink } from '../sink.js'
import type { IStream, Sink } from '../types.js'

export interface ISkipCurry {
  <T>(n: number, source: IStream<T>): IStream<T>
  <T>(n: number): (source: IStream<T>) => IStream<T>
}

/**
 * Skip the first n items from a stream
 */
export const skip: ISkipCurry = curry2((n, source) => ({
  run(scheduler, sink) {
    return source.run(scheduler, new SkipSink(n, sink))
  }
}))

class SkipSink<T> extends PipeSink<T> {
  private skipped = 0

  constructor(
    private readonly n: number,
    sink: Sink<T>
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
