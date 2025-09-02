import type { IScheduler, ISink, IStream, Time } from '../types.js'
import { disposeBoth, disposeNone } from '../utils/disposable.js'
import { curry2 } from '../utils/function.js'

/**
 * When stream ends, continue with values from another stream
 *
 * streamA:         -a-b-c|
 * streamB:               -x-y-z->
 * continueWith(f): -a-b-c-x-y-z->
 */
export const continueWith: IContinueWithCurry = curry2((f, s) => new ContinueWith(f, s))

/**
 * Stream that continues with values from another stream when the first ends
 */
class ContinueWith<A, B> implements IStream<A | B> {
  constructor(
    readonly f: (time: Time) => IStream<B>,
    readonly source: IStream<A>
  ) {}

  run(sink: ISink<A | B>, scheduler: IScheduler): Disposable {
    const continuwSinkDisposable = new ContinueWithSink(sink, scheduler, this.f)
    const sourceDisposable = this.source.run(continuwSinkDisposable, scheduler)

    return disposeBoth(sourceDisposable, continuwSinkDisposable)
  }
}

class ContinueWithSink<A, B> implements ISink<A>, Disposable {
  disposable: Disposable = disposeNone

  constructor(
    readonly sink: ISink<A | B>,
    readonly scheduler: IScheduler,
    readonly f: (time: Time) => IStream<B>
  ) {}

  event(time: Time, value: A): void {
    this.sink.event(time, value)
  }

  error(time: Time, error: any): void {
    this.sink.error(time, error)
  }

  end(time: Time): void {
    try {
      const nextStream = this.f(time)
      this.disposable = nextStream.run(this.sink, this.scheduler)
    } catch (error) {
      this.sink.error(time, error)
    }
  }

  [Symbol.dispose](): void {
    if (this.disposable === disposeNone) return

    this.disposable[Symbol.dispose]()
  }
}

export interface IContinueWithCurry {
  <A, B>(f: (time: Time) => IStream<B>, s: IStream<A>): IStream<A | B>
  <A, B>(f: (time: Time) => IStream<B>): (s: IStream<A>) => IStream<A | B>
}
