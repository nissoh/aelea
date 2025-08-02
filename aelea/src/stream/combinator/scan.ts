import { curry3 } from '../function.js'
import { TransformSink } from '../sink.js'
import type { IStream, Sink } from '../types.js'

export interface IScanCurry {
  <I, O>(f: (acc: O, value: I) => O, initial: O, s: IStream<I>): IStream<O>
  <I, O>(f: (acc: O, value: I) => O, initial: O): (s: IStream<I>) => IStream<O>
  <I, O>(f: (acc: O, value: I) => O): (initial: O) => (s: IStream<I>) => IStream<O>
}

export const scan: IScanCurry = curry3((f, initial, s) => ({
  run(env, sink) {
    return s.run(env, new ScanSink(f, initial, sink))
  }
}))

class ScanSink<I, O> extends TransformSink<I, O> {
  constructor(
    public readonly f: (acc: O, value: I) => O,
    private accumulator: O,
    sink: Sink<O>
  ) {
    super(sink)
  }

  event(value: I) {
    this.accumulator = this.f(this.accumulator, value)
    this.sink.event(this.accumulator)
  }
}
