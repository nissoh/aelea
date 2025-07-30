import { disposeBoth } from '../disposable.js'
import type { Disposable, IStream, Scheduler, Sink } from '../types.js'

/**
 * Sample values from a stream whenever a sampler stream emits.
 * Returns the latest value from the values stream each time the sampler emits.
 */
export const sample =
  <A, B>(values: IStream<A>) =>
  (sampler: IStream<B>): IStream<A> =>
    snapshot((x) => x, values)(sampler)

/**
 * Combine the latest values from two streams whenever the sampler stream emits.
 * @param f Function to combine values
 * @param values Stream of values to sample from
 * @param sampler Stream that triggers sampling
 * @returns Stream of combined values
 */
export const snapshot =
  <A, B, C>(f: (a: A, b: B) => C, values: IStream<A>) =>
  (sampler: IStream<B>): IStream<C> => ({
    run(scheduler, sink) {
      return new Snapshot(f, values, sampler).run(scheduler, sink)
    }
  })

class Snapshot<A, B, C> {
  constructor(
    private readonly f: (a: A, b: B) => C,
    private readonly values: IStream<A>,
    private readonly sampler: IStream<B>
  ) {}

  run(scheduler: Scheduler, sink: Sink<C>): Disposable {
    const sampleSink = new SnapshotSink(this.f, sink)
    const valuesDisposable = this.values.run(scheduler, sampleSink.latest)
    const samplerDisposable = this.sampler.run(scheduler, sampleSink)

    return disposeBoth(samplerDisposable, valuesDisposable)
  }
}

class SnapshotSink<A, B, C> implements Sink<B> {
  readonly latest: LatestValueSink<A>

  constructor(
    private readonly f: (a: A, b: B) => C,
    private readonly sink: Sink<C>
  ) {
    this.latest = new LatestValueSink(this)
  }

  event(x: B): void {
    if (this.latest.hasValue) {
      const f = this.f
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.sink.event(f(this.latest.value!, x))
    }
  }

  error(e: any): void {
    this.sink.error(e)
  }

  end(): void {
    this.sink.end()
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
