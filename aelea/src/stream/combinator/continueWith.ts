import type { IScheduler, ISink, IStream, ITime } from '../types.js'
import { disposeNone } from '../utils/disposable.js'
import { curry2 } from '../utils/function.js'

/**
 * When stream ends, continue with values from another stream. A continuation
 * that cannot be produced is a stream failure: error then end.
 *
 * streamA:         -a-b-c|
 * streamB:               -x-y-z->
 * continueWith(f): -a-b-c-x-y-z->
 */
export const continueWith: IContinueWithCurry = curry2((f, s) => new ContinueWith(f, s))

class ContinueWith<A, B> implements IStream<A | B> {
  constructor(
    readonly f: (time: ITime) => IStream<B>,
    readonly source: IStream<A>
  ) {}

  run(sink: ISink<A | B>, scheduler: IScheduler): Disposable {
    const continueSink = new ContinueWithSink(sink, scheduler, this.f)
    const source = this.source.run(continueSink, scheduler)
    if (continueSink.sourceEnded) {
      source[Symbol.dispose]()
    } else {
      continueSink.source = source
    }
    return continueSink
  }
}

class ContinueWithSink<A, B> implements ISink<A>, Disposable {
  source: Disposable = disposeNone
  next: Disposable = disposeNone
  sourceEnded = false
  disposed = false

  constructor(
    readonly sink: ISink<A | B>,
    readonly scheduler: IScheduler,
    readonly f: (time: ITime) => IStream<B>
  ) {}

  event(time: ITime, value: A): void {
    this.sink.event(time, value)
  }

  error(time: ITime, error: unknown): void {
    this.sink.error(time, error)
  }

  end(time: ITime): void {
    if (this.disposed || this.sourceEnded) return
    this.sourceEnded = true
    const source = this.source
    this.source = disposeNone
    source[Symbol.dispose]()
    try {
      this.next = this.f(time).run(this.sink, this.scheduler)
    } catch (error) {
      this.sink.error(time, error)
      this.sink.end(time)
    }
  }

  [Symbol.dispose](): void {
    if (this.disposed) return
    this.disposed = true
    const source = this.source
    const next = this.next
    this.source = disposeNone
    this.next = disposeNone
    source[Symbol.dispose]()
    next[Symbol.dispose]()
  }
}

export interface IContinueWithCurry {
  <A, B>(f: (time: ITime) => IStream<B>, s: IStream<A>): IStream<A | B>
  <A, B>(f: (time: ITime) => IStream<B>): (s: IStream<A>) => IStream<A | B>
}
