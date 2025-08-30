import type { IScheduler, ISink, IStream } from '../types.js'
import { disposeBoth } from '../utils/disposable.js'
import { curry2 } from '../utils/function.js'

/**
 * When stream ends, continue with values from another stream
 *
 * streamA:         -abc|
 * streamB:             123->
 * continueWith(f): -abc123->
 */
export const continueWith: IContinueWithCurry = curry2((f, s) => new ContinueWith(f, s))

/**
 * Stream that continues with values from another stream when the first ends
 */
class ContinueWith<A, B> implements IStream<A | B> {
  constructor(
    readonly f: (time: number) => IStream<B>,
    readonly source: IStream<A>
  ) {}

  run(sink: ISink<A | B>, scheduler: IScheduler): Disposable {
    const dsink = new ContinueWithSink(sink, scheduler, this.f)
    return disposeBoth(this.source.run(dsink, scheduler), dsink)
  }
}

class ContinueWithSink<A, B> implements ISink<A> {
  disposable: Disposable | null = null

  constructor(
    readonly sink: ISink<A | B>,
    readonly scheduler: IScheduler,
    readonly f: (time: number) => IStream<B>
  ) {}

  event(time: number, value: A): void {
    this.sink.event(time, value)
  }

  error(time: number, error: any): void {
    this.sink.error(time, error)
  }

  end(time: number): void {
    if (this.disposable) {
      this.disposable[Symbol.dispose]()
    }
    try {
      const nextStream = this.f(time)
      this.disposable = nextStream.run(this.sink, this.scheduler)
    } catch (error) {
      this.sink.error(time, error)
    }
  }

  [Symbol.dispose](): void {
    if (this.disposable) {
      this.disposable[Symbol.dispose]()
    }
  }
}

export interface IContinueWithCurry {
  <A, B>(f: (time: number) => IStream<B>, s: IStream<A>): IStream<A | B>
  <A, B>(f: (time: number) => IStream<B>): (s: IStream<A>) => IStream<A | B>
}
