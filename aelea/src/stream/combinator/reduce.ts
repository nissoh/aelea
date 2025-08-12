import type { IScheduler, ISink, IStream } from '../types.js'
import { curry3 } from '../utils/function.js'
import { PipeSink } from '../utils/sink.js'

/**
 * Stream that accumulates values using a reducer function
 */
class Reduce<I, O> implements IStream<O> {
  constructor(
    private readonly f: ReduceFunction<I, O>,
    private readonly initial: O,
    private readonly source: IStream<I>
  ) {}

  run(sink: ISink<O>, scheduler: IScheduler): Disposable {
    return this.source.run(new ReduceSink(this.f, this.initial, sink), scheduler)
  }
}

/**
 * Accumulate values from a stream
 *
 * stream:          -1-2-3-4->
 * reduce(+, 0): -1-3-6-10->
 */
export const reduce: IReduceCurry = curry3((f, initial, s) => new Reduce(f, initial, s))

class ReduceSink<I, O> extends PipeSink<I, O> {
  constructor(
    readonly f: ReduceFunction<I, O>,
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

export type ReduceFunction<I, O> = (acc: O, value: I) => O

export interface IReduceCurry {
  <I, O>(f: ReduceFunction<I, O>, initial: O, s: IStream<I>): IStream<O>
  <I, O>(f: ReduceFunction<I, O>, initial: O): (s: IStream<I>) => IStream<O>
  <I, O>(f: ReduceFunction<I, O>): (initial: O) => (s: IStream<I>) => IStream<O>
}
