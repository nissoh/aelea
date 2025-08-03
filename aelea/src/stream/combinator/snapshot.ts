import { stream } from '../stream.js'
import type { ISink, IStream } from '../types.js'
import { disposeBoth } from '../utils/disposable.js'
import { curry2, curry3 } from '../utils/function.js'
import { PipeSink } from '../utils/sink.js'

export const sample: ISampleCurry = curry2((values, sampler) => snapshot((x) => x, values, sampler))

export const snapshot: ISnapshotCurry = curry3((f, values, sampler) =>
  stream((scheduler, sink) => {
    const seedSink = new SnapshotSink(f, sink)
    const valuesDisposable = values.run(scheduler, seedSink.seedSink)
    const samplerDisposable = sampler.run(scheduler, seedSink)

    return disposeBoth(samplerDisposable, valuesDisposable)
  })
)

class SnapshotSink<A, B, C> extends PipeSink<B, C> {
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

export interface ISnapshotCurry {
  <A, B, C>(f: (a: A, b: B) => C, values: IStream<A>, sampler: IStream<B>): IStream<C>
  <A, B, C>(f: (a: A, b: B) => C, values: IStream<A>): (sampler: IStream<B>) => IStream<C>
  <A, B, C>(f: (a: A, b: B) => C): (values: IStream<A>) => (sampler: IStream<B>) => IStream<C>
}
