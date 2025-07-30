import { TransformSink } from '../sink.js'
import type { IStream, Sink } from '../types.js'

export const scan =
  <I, O, E>(f: (acc: O, value: I) => O, initial: O) =>
  (s: IStream<I, E>): IStream<O, E> =>
  (env, sink) =>
    s(env, new ScanSink(f, initial, sink))

class ScanSink<In, Out> extends TransformSink<In, Out> {
  constructor(
    public readonly f: (acc: Out, value: In) => Out,
    private accumulator: Out,
    sink: Sink<Out>
  ) {
    super(sink)
  }

  event(value: In) {
    this.tryEvent(() => {
      this.accumulator = this.f(this.accumulator, value)
      this.sink.event(this.accumulator)
    })
  }
}
