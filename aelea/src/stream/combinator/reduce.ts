import { propagateRunEventTask } from '../scheduler/PropagateTask.js'
import type { IScheduler, ISink, IStream } from '../types.js'
import { disposeBoth } from '../utils/disposable.js'
import { curry3 } from '../utils/function.js'
import { PipeSink } from '../utils/sink.js'

/**
 * Accumulate values from a stream
 *
 * stream:          -1-2-3-4->
 * reduce(+, 0): -1-3-6-10->
 */
export const reduce: IReduceCurry = curry3((f, seed, s) => new Reduce(f, seed, s))

/**
 * Stream that accumulates values using a reducer function
 */
class Reduce<I, O> implements IStream<O> {
  constructor(
    readonly f: ReduceFunction<I, O>,
    readonly seed: O,
    readonly source: IStream<I>
  ) {}

  run(sink: ISink<O>, scheduler: IScheduler): Disposable {
    const seedDisposable = scheduler.asap(propagateRunEventTask(sink, emitSeed, this.seed))
    const sourceDisposable = this.source.run(new ReduceSink(this.f, this.seed, sink), scheduler)
    return disposeBoth(seedDisposable, sourceDisposable)
  }
}

function emitSeed<O>(sink: ISink<O>, value: O): void {
  sink.event(value)
}

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
