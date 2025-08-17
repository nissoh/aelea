import type { IScheduler, ISink, IStream } from '../types.js'
import { curry3 } from '../utils/function.js'
import { PipeSink } from '../utils/sink.js'

export type AggregateFunction<I, S, O> = (seed: S, value: I) => { seed: S; value: O }

/**
 * Stream that accumulates results using a feedback loop
 */
class Aggregate<I, S, O> implements IStream<O> {
  constructor(
    private readonly f: AggregateFunction<I, S, O>,
    private readonly initial: S,
    private readonly source: IStream<I>
  ) {}

  run(sink: ISink<O>, scheduler: IScheduler): Disposable {
    return this.source.run(new AggregateSink(this.f, this.initial, sink), scheduler)
  }
}

/**
 * Accumulate results using a feedback loop that emits one value and feeds back
 * another to be used in the next iteration.
 */
export const aggregate: IAggregateCurry = curry3((f, initial, s) => new Aggregate(f, initial, s))

class AggregateSink<I, S, O> extends PipeSink<I, O> {
  constructor(
    readonly step: AggregateFunction<I, S, O>,
    public seed: S,
    sink: ISink<O>
  ) {
    super(sink)
  }

  event(value: I) {
    try {
      const result = this.step(this.seed, value)
      this.seed = result.seed
      this.sink.event(result.value)
    } catch (error) {
      this.sink.error(error)
    }
  }
}

export interface IAggregateCurry {
  <I, S, O>(f: AggregateFunction<I, S, O>, initial: S, s: IStream<I>): IStream<O>
  <I, S, O>(f: AggregateFunction<I, S, O>, initial: S): (s: IStream<I>) => IStream<O>
  <I, S, O>(f: AggregateFunction<I, S, O>): (initial: S) => (s: IStream<I>) => IStream<O>
}
