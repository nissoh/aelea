import { stream } from '../stream.js'
import type { ISink, IStream } from '../types.js'
import { curry3 } from '../utils/function.js'
import { PipeSink } from '../utils/sink.js'

/**
 * Accumulate values from a stream
 *
 * stream:      -1-2-3-4->
 * scan(+, 0):  -1-3-6-10->
 */
export const scan: IScanCurry = curry3((f, initial, s) =>
  stream((sink, scheduler) => s.run(new ScanSink(f, initial, sink), scheduler))
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
    try {
      this.accumulator = this.f(this.accumulator, value)
    } catch (error) {
      this.sink.error(error)
      return
    }
    this.sink.event(this.accumulator)
  }
}

export interface IScanCurry {
  <I, O>(f: (acc: O, value: I) => O, initial: O, s: IStream<I>): IStream<O>
  <I, O>(f: (acc: O, value: I) => O, initial: O): (s: IStream<I>) => IStream<O>
  <I, O>(f: (acc: O, value: I) => O): (initial: O) => (s: IStream<I>) => IStream<O>
}
