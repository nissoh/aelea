import { TransformSink } from '../sink.js'
import type { IStream, Sink } from '../types.js'

export const tap =
  <T, E>(f: (value: T) => unknown) =>
  (s: IStream<T, E>): IStream<T, E> =>
  (env, sink) =>
    s(env, new TapSink(f, sink))

class TapSink<T> extends TransformSink<T, T> {
  constructor(
    public readonly f: (value: T) => unknown,
    sink: Sink<T>
  ) {
    super(sink)
  }

  event(value: T) {
    this.tryEvent(() => {
      this.f(value)
      this.sink.event(value)
    })
  }
}
