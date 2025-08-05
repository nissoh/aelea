import { stream } from '../stream.js'
import type { ISink, IStream } from '../types.js'
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
 * sampleMap:  ---[2,a]-[4,b]-[6,c]->
 */
export const sampleMap: ISampleMapCurry = curry3((f, values, sampler) =>
  stream((sink, scheduler) => {
    const seedSink = new SampleMapSink(f, sink)
    const valuesDisposable = values.run(seedSink.seedSink, scheduler)
    const samplerDisposable = sampler.run(seedSink, scheduler)

    return disposeBoth(samplerDisposable, valuesDisposable)
  })
)

class SampleMapSink<A, B, C> extends PipeSink<B, C> {
  readonly seedSink: SeedSink<A>

  constructor(
    private readonly f: (a: A, b: B) => C,
    sink: ISink<C>
  ) {
    super(sink)
    this.seedSink = new SeedSink(this)
  }

  event(x: B): void {
    if (this.seedSink.hasValue) {
      try {
        const result = this.f(this.seedSink.value!, x)
        this.sink.event(result)
      } catch (error) {
        this.sink.error(error)
      }
    }
  }
}

class SeedSink<A> implements ISink<A> {
  hasValue = false
  value?: A

  constructor(private readonly sink: ISink<unknown>) {}

  event(x: A): void {
    this.value = x
    this.hasValue = true
  }

  error(e: any): void {
    this.sink.error(e)
  }

  end(): void {
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
