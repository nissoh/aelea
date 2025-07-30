import { TransformSink } from '../sink.js'
import type { IStream, Sink } from '../types.js'

export const map =
  <I, O>(f: (value: I) => O) =>
  (source: IStream<I>): IStream<O> => ({
    run(scheduler, sink) {
      return source.run(scheduler, new MapSink(f, sink))
    }
  })

class MapSink<In, Out> extends TransformSink<In, Out> {
  constructor(
    public readonly f: (value: In) => Out,
    sink: Sink<Out>
  ) {
    super(sink)
  }

  event(value: In) {
    try {
      this.sink.event(this.f(value))
    } catch (error) {
      this.sink.error(error)
    }
  }
}
