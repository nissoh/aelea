import type { IScheduler, ISink, IStream } from '../types.js'
import { curry2 } from '../utils/function.js'
import { PipeSink } from '../utils/sink.js'

/**
 * Stream that skips the first n values from the source stream
 */
class Skip<T> implements IStream<T> {
  constructor(
    readonly n: number,
    readonly source: IStream<T>
  ) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    return this.source.run(new SkipSink(this.n, sink), scheduler)
  }
}

/**
 * Skip the first n values from a stream
 *
 * stream:   -1-2-3-4-5-6->
 * skip(3):  -------4-5-6->
 */
export const skip: ISkipCurry = curry2((n, source) => new Skip(n, source))

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
