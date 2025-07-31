import { curry3 } from '../function.js'
import { TransformSink } from '../sink.js'
import type { IStream, Sink } from '../types.js'

export interface IScanCurry {
  <I, O>(f: (acc: O, value: I) => O, initial: O, s: IStream<I>): IStream<O>
  <I, O>(f: (acc: O, value: I) => O, initial: O): (s: IStream<I>) => IStream<O>
  <I, O>(f: (acc: O, value: I) => O): (initial: O) => (s: IStream<I>) => IStream<O>
}

export const scan: IScanCurry = curry3(<I, O>(f: (acc: O, value: I) => O, initial: O, s: IStream<I>) => ({
  run(env, sink) {
    return s.run(env, new ScanSink(f, initial, sink))
  }
}))

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
