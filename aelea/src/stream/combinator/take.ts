import { stream } from '../stream.js'
import type { ISink, IStream } from '../types.js'
import { curry2 } from '../utils/function.js'
import { PipeSink } from '../utils/sink.js'

/**
 * Take only the first n values from a stream
 * 
 * stream:   -1-2-3-4-5-6->
 * take(3):  -1-2-3-|
 */
export const take: ITakeCurry = curry2((n, source) =>
  stream((scheduler, sink) => source.run(scheduler, new TakeSink(n, sink)))
)

export interface ITakeCurry {
  <T>(n: number, source: IStream<T>): IStream<T>
  <T>(n: number): (source: IStream<T>) => IStream<T>
}

class TakeSink<T> extends PipeSink<T> {
  private taken = 0

  constructor(
    private readonly n: number,
    sink: ISink<T>
  ) {
    super(sink)
  }

  event(value: T) {
    if (this.taken < this.n) {
      this.taken++
      this.sink.event(value)

      if (this.taken === this.n) {
        this.end()
      }
    }
  }
}
