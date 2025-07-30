import { TransformSink } from '../sink.js'
import type { IStream, Sink } from '../types.js'

export const take =
  <T>(n: number) =>
  (source: IStream<T>): IStream<T> => ({
    run(scheduler, sink) {
      return source.run(scheduler, new TakeSink(n, sink))
    }
  })

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
