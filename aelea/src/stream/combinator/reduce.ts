import { propagateRunEventTask } from '../scheduler/PropagateTask.js'
import type { IScheduler, ISink, IStream, ITime } from '../types.js'
import { disposeBoth } from '../utils/disposable.js'
import { curry3 } from '../utils/function.js'
import { PipeSink } from '../utils/sink.js'

/**
 * Accumulate values from a stream. The seed is always the first event, even
 * when the source emits synchronously on subscription.
 *
 * stream:       -1-2-3->
 * reduce(+, 0): 01-3-6->
 */
export const reduce: IReduceCurry = curry3((f, seed, s) => new Reduce(f, seed, s))

class Reduce<I, O> implements IStream<O> {
  constructor(
    readonly f: ReduceFunction<I, O>,
    readonly seed: O,
    readonly source: IStream<I>
  ) {}

  run(sink: ISink<O>, scheduler: IScheduler): Disposable {
    const reduceSink = new ReduceSink(this.f, this.seed, sink)
    const seedDisposable = scheduler.asap(propagateRunEventTask(sink, emitSeed, reduceSink))
    return disposeBoth(seedDisposable, this.source.run(reduceSink, scheduler))
  }
}

class ReduceSink<I, O> extends PipeSink<I, O> {
  seeded = false

  constructor(
    readonly f: ReduceFunction<I, O>,
    public accumulator: O,
    sink: ISink<O>
  ) {
    super(sink)
  }

  emitSeed(time: ITime): void {
    if (this.seeded) return
    this.seeded = true
    this.sink.event(time, this.accumulator)
  }

  event(time: ITime, value: I) {
    if (!this.seeded) {
      this.seeded = true
      this.sink.event(time, this.accumulator)
    }
    try {
      this.accumulator = this.f(this.accumulator, value)
    } catch (error) {
      this.sink.error(time, error)
      return
    }
    this.sink.event(time, this.accumulator)
  }

  override error(time: ITime, error: unknown): void {
    this.emitSeed(time)
    this.sink.error(time, error)
  }

  override end(time: ITime): void {
    this.emitSeed(time)
    this.sink.end(time)
  }
}

function emitSeed<I, O>(time: ITime, _sink: ISink<O>, reduceSink: ReduceSink<I, O>): void {
  reduceSink.emitSeed(time)
}

export type ReduceFunction<I, O> = (acc: O, value: I) => O

export interface IReduceCurry {
  <I, O>(f: ReduceFunction<I, O>, initial: O, s: IStream<I>): IStream<O>
  <I, O>(f: ReduceFunction<I, O>, initial: O): (s: IStream<I>) => IStream<O>
  <I, O>(f: ReduceFunction<I, O>): (initial: O) => (s: IStream<I>) => IStream<O>
}
