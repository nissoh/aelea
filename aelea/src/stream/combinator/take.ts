import { curry2 } from '../function.js'
import { TransformSink } from '../sink.js'
import type { IStream, Sink } from '../types.js'

export interface ITakeCurry {
  <T>(n: number, source: IStream<T>): IStream<T>
  <T>(n: number): (source: IStream<T>) => IStream<T>
}

export const take: ITakeCurry = curry2((n, source) => ({
  run(scheduler, sink) {
    return source.run(scheduler, new TakeSink(n, sink))
  }
}))

class TakeSink<T> extends TransformSink<T, T> {
  private taken = 0

  constructor(
    private readonly n: number,
    sink: Sink<T>
  ) {
    super(sink)
  }

  event(value: T) {
    if (this.taken < this.n) {
      this.taken++
      this.tryEvent(() => this.sink.event(value))

      if (this.taken === this.n) {
        this.end()
      }
    }
  }
}
