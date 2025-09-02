import type { IScheduler, ISink, IStream, ITime } from '../types.js'
import { disposeBoth } from '../utils/disposable.js'
import { curry2, curry3 } from '../utils/function.js'

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
    const disposableSampleSink = new SampleSink(sink, scheduler, this.values, this.f)
    const disposableSampler = this.sampler.run(disposableSampleSink, scheduler)

    return disposeBoth(disposableSampleSink, disposableSampler)
  }
}

class SampleSink<A, B, C> implements ISink<B>, Disposable {
  latestValue?: { value: A }
  valuesDisposable: Disposable

  constructor(
    readonly sink: ISink<C>,
    readonly scheduler: IScheduler,
    readonly values: IStream<A>,
    readonly f: (a: A, b: B) => C
  ) {
    const valueSink = new ValueSink(this)

    this.valuesDisposable = this.values.run(valueSink, scheduler)
  }

  event(time: ITime, b: B): void {
    if (this.latestValue) {
      try {
        const result = this.f(this.latestValue.value, b)
        this.sink.event(time, result)
      } catch (error) {
        this.sink.error(time, error)
      }
    }
  }

  error(time: ITime, error: any): void {
    this.sink.error(time, error)
  }

  end(time: ITime): void {
    // Dispose values stream when sampler ends
    this.valuesDisposable[Symbol.dispose]()
    this.sink.end(time)
  }

  [Symbol.dispose](): void {
    this.valuesDisposable[Symbol.dispose]()
  }
}

class ValueSink<A> implements ISink<A> {
  constructor(readonly parent: SampleSink<A, any, any>) {}

  event(_time: ITime, value: A): void {
    if (this.parent.latestValue) {
      this.parent.latestValue.value = value
    } else {
      this.parent.latestValue = { value }
    }
  }

  error(_time: ITime, _error: any): void {
    // Don't propagate errors from values stream
  }

  end(_time: ITime): void {
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
