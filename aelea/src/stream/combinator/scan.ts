import { stream } from '../stream.js'
import type { ISink, IStream } from '../types.js'
import { curry3 } from '../utils/function.js'
import { PipeSink } from '../utils/sink.js'

export interface IScanCurry {
  <I, O>(f: (acc: O, value: I) => O, initial: O, s: IStream<I>): IStream<O>
  <I, O>(f: (acc: O, value: I) => O, initial: O): (s: IStream<I>) => IStream<O>
  <I, O>(f: (acc: O, value: I) => O): (initial: O) => (s: IStream<I>) => IStream<O>
}

export const scan: IScanCurry = curry3((f, initial, s) =>
  stream((scheduler, sink) => s.run(scheduler, new ScanSink(f, initial, sink)))
)

class ScanSink<I, O> extends PipeSink<I, O> {
  constructor(
    public readonly f: (acc: O, value: I) => O,
    private accumulator: O,
    sink: ISink<O>
  ) {
    super(sink)
  }

  event(value: I) {
    this.accumulator = this.f(this.accumulator, value)
    this.sink.event(this.accumulator)
  }
}
