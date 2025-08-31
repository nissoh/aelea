import type { IScheduler, ISink, IStream, Time } from '../types.js'
import { disposeBoth } from '../utils/disposable.js'
import { curry2, curry3 } from '../utils/function.js'
import { PipeSink } from '../utils/sink.js'
/**
 * Sample values from one stream at the times of events in another
 *
 * values:  -1-2-3-4-5-6-7-8->
 * sampler: ---x---x---x----->
 * sample:  ---2---4---6----->
 */
export const sample: ISampleCurry = curry2((values, sampler) => sampleMap(x => x, values, sampler))

/**
 * Combine values from two streams at sample times
 *
 * values:     -1-2-3-4-5-6->
 * sampler:    ---a---b---c->
 * sampleMap:  ---A---B---C->
 *                |   |   |
 *                |   |   +-- [6,c]
 *                |   +-- [4,b]
 *                +-- [2,a]
 */
export const sampleMap: ISampleMapCurry = curry3((f, values, sampler) => new SampleMap(f, values, sampler))

/**
 * Stream that combines values from two streams at sample times
 */
class SampleMap<A, B, C> implements IStream<C> {
  constructor(
    readonly f: (a: A, b: B) => C,
    readonly values: IStream<A>,
    readonly sampler: IStream<B>
  ) {}

  run(sink: ISink<C>, scheduler: IScheduler): Disposable {
    const seedSink = new SampleMapSink(this.f, sink)
    const valuesDisposable = this.values.run(seedSink.seedSink, scheduler)
    const samplerDisposable = this.sampler.run(seedSink, scheduler)

    return disposeBoth(samplerDisposable, valuesDisposable)
  }
}

class SampleMapSink<A, B, C> extends PipeSink<B, C> {
  readonly seedSink: SeedSink<A>

  constructor(
    readonly f: (a: A, b: B) => C,
    sink: ISink<C>
  ) {
    super(sink)
    this.seedSink = new SeedSink(this)
  }

  event(time: Time, x: B): void {
    const boxedValue = this.seedSink.value
    if (boxedValue !== undefined) {
      try {
        const result = this.f(boxedValue.value, x)
        this.sink.event(time, result)
      } catch (error) {
        this.sink.error(time, error)
      }
    }
  }
}

class SeedSink<A> implements ISink<A> {
  value?: { value: A }

  constructor(readonly sink: ISink<unknown>) {}

  event(_time: Time, x: A): void {
    if (this.value === undefined) {
      this.value = { value: x }
    } else {
      this.value.value = x
    }
  }

  error(time: Time, e: any): void {
    this.sink.error(time, e)
  }

  end(_time: Time): void {
    // Don't propagate end from values stream
  }
}

export interface ISampleCurry {
  <A, B>(values: IStream<A>, sampler: IStream<B>): IStream<A>
  <A, B>(values: IStream<A>): (sampler: IStream<B>) => IStream<A>
}

export interface ISampleMapCurry {
  <A, B, C>(f: (a: A, b: B) => C, values: IStream<A>, sampler: IStream<B>): IStream<C>
  <A, B, C>(f: (a: A, b: B) => C, values: IStream<A>): (sampler: IStream<B>) => IStream<C>
  <A, B, C>(f: (a: A, b: B) => C): (values: IStream<A>) => (sampler: IStream<B>) => IStream<C>
}
