import type { IScheduler, ISink, IStream } from '../types.js'
import { disposeBoth } from '../utils/disposable.js'
import { curry2 } from '../utils/function.js'

/**
 * Stream that continues with values from another stream when the first ends
 */
class ContinueWith<A, B> implements IStream<A | B> {
  constructor(
    readonly f: () => IStream<B>,
    readonly source: IStream<A>
  ) {}

  run(sink: ISink<A | B>, scheduler: IScheduler): Disposable {
    const dsink = new ContinueWithSink(sink, scheduler, this.f)
    return disposeBoth(this.source.run(dsink, scheduler), dsink)
  }
}

/**
 * When stream ends, continue with values from another stream
 *
 * streamA:         -1-2-3-|
 * streamB:                 -4-5-6->
 * continueWith(f): -1-2-3-4-5-6->
 */
export const continueWith: IContinueWithCurry = curry2((f, s) => new ContinueWith(f, s))

class ContinueWithSink<A, B> implements ISink<A> {
  disposable: Disposable | null = null

  constructor(
    readonly sink: ISink<A | B>,
    readonly scheduler: IScheduler,
    readonly f: () => IStream<B>
  ) {}

  event(value: A): void {
    this.sink.event(value)
  }

  error(error: any): void {
    this.sink.error(error)
  }

  end(): void {
    if (this.disposable) {
      this.disposable[Symbol.dispose]()
    }
    try {
      const nextStream = this.f()
      this.disposable = nextStream.run(this.sink, this.scheduler)
    } catch (error) {
      this.sink.error(error)
    }
  }

  [Symbol.dispose](): void {
    if (this.disposable) {
      this.disposable[Symbol.dispose]()
    }
  }
}

export interface IContinueWithCurry {
  <A, B>(f: () => IStream<B>, s: IStream<A>): IStream<A | B>
  <A, B>(f: () => IStream<B>): (s: IStream<A>) => IStream<A | B>
}
