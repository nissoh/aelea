import { stream } from '../stream.js'
import type { ISink, IStream } from '../types.js'
import { curry3 } from '../utils/function.js'
import { PipeSink } from '../utils/sink.js'

/**
 * Accumulate values from a stream
 *
 * stream:          -1-2-3-4->
 * reduce(+, 0): -1-3-6-10->
 */
export const reduce: IReduceCurry = curry3((f, initial, s) =>
  stream((sink, scheduler) => s.run(new ReduceSink(f, initial, sink), scheduler))
)

class ReduceSink<I, O> extends PipeSink<I, O> {
  constructor(
    readonly f: ReduceFunction<I, O, O>,
    public accumulator: O,
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

export type ReduceFunction<I, S, O> = (acc: S, value: I) => O

export interface IReduceCurry {
  <I, O>(f: ReduceFunction<I, O, O>, initial: O, s: IStream<I>): IStream<O>
  <I, O>(f: ReduceFunction<I, O, O>, initial: O): (s: IStream<I>) => IStream<O>
  <I, O>(f: ReduceFunction<I, O, O>): (initial: O) => (s: IStream<I>) => IStream<O>
}
