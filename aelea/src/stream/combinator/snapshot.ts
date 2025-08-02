import { stream } from '../stream.js'
import type { IStream, Sink } from '../types.js'
import { disposeBoth } from '../utils/disposable.js'
import { curry2, curry3 } from '../utils/function.js'
import { PipeSink } from '../utils/sink.js'

export const sample: ISampleCurry = curry2((values, sampler) => snapshot((x) => x, values, sampler))

export const snapshot: ISnapshotCurry = curry3((f, values, sampler) =>
  stream((scheduler, sink) => {
    const sampleSink = new SnapshotSink(f, sink)
    const valuesDisposable = values.run(scheduler, sampleSink.latest)
    const samplerDisposable = sampler.run(scheduler, sampleSink)

    return disposeBoth(samplerDisposable, valuesDisposable)
  })
)

export interface ISampleCurry {
  <A, B>(values: IStream<A>, sampler: IStream<B>): IStream<A>
  <A, B>(values: IStream<A>): (sampler: IStream<B>) => IStream<A>
}

export interface ISnapshotCurry {
  <A, B, C>(f: (a: A, b: B) => C, values: IStream<A>, sampler: IStream<B>): IStream<C>
  <A, B, C>(f: (a: A, b: B) => C, values: IStream<A>): (sampler: IStream<B>) => IStream<C>
  <A, B, C>(f: (a: A, b: B) => C): (values: IStream<A>) => (sampler: IStream<B>) => IStream<C>
}

class SnapshotSink<A, B, C> extends PipeSink<B, C> {
  readonly latest: LatestValueSink<A>

  constructor(
    private readonly f: (a: A, b: B) => C,
    sink: Sink<C>
  ) {
    super(sink)
    this.latest = new LatestValueSink(this)
  }

  event(x: B): void {
    if (this.latest.hasValue) {
      try {
        const result = this.f(this.latest.value!, x)
        this.sink.event(result)
      } catch (error) {
        this.sink.error(error)
      }
    }
  }
}

class LatestValueSink<A> implements Sink<A> {
  hasValue = false
  value?: A

  constructor(private readonly parent: Sink<unknown>) {}

  event(x: A): void {
    this.value = x
    this.hasValue = true
  }

  error(e: any): void {
    this.parent.error(e)
  }

  end(): void {
    // Don't propagate end from values stream
  }
}
