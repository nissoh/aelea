import type { IScheduler, ISink, IStream, ITime } from '../types.js'
import { disposeBoth, disposeNone } from '../utils/disposable.js'
import { curry2, curry3 } from '../utils/function.js'

export const join = <A>(stream: IStream<IStream<A>>): IStream<A> =>
  joinConcurrentlyMap(Number.POSITIVE_INFINITY, stream)

export const joinMap: IJoinMapCurry = curry2((f, source) => joinMapConcurrently(f, Number.POSITIVE_INFINITY, source))

const identity = <T>(x: T): T => x

export const joinConcurrentlyMap: IMergeConcurrentlyMapCurry = curry2((concurrency, stream) =>
  joinMapConcurrently(identity, concurrency, stream)
)

export const joinMapConcurrently: IMergeMapConcurrentlyCurry = curry3(
  (f, concurrency, source) => new JoinMapConcurrently(f, concurrency, source)
)

/**
 * Stream that flattens a stream of streams with concurrency control
 */
class JoinMapConcurrently<A, B> implements IStream<B> {
  constructor(
    readonly f: (a: A) => IStream<B>,
    readonly concurrency: number,
    readonly source: IStream<A>
  ) {}

  run(sink: ISink<B>, scheduler: IScheduler): Disposable {
    const joinSink = new JoinSink(sink, scheduler, this.f, this.concurrency)
    const sourceDisposable = this.source.run(joinSink, scheduler)
    return disposeBoth(sourceDisposable, joinSink)
  }
}

class JoinSink<A, B> implements ISink<A>, Disposable {
  sourceEnded = false
  readonly current: InnerSink<B>[] = []
  readonly pending: A[] = []

  constructor(
    readonly sink: ISink<B>,
    readonly scheduler: IScheduler,
    readonly f: (a: A) => IStream<B>,
    readonly concurrency: number
  ) {}

  event(time: ITime, x: A): void {
    if (this.current.length < this.concurrency) {
      this.startInner(time, x)
    } else {
      this.pending.push(x)
    }
  }

  startInner(time: ITime, value: A): void {
    try {
      const innerSink = new InnerSink(this, this.sink)
      const innerStream = this.f(value)
      innerSink.disposable = innerStream.run(innerSink, this.scheduler)
      this.current.push(innerSink)
    } catch (err) {
      this.sink.error(time, err)
    }
  }

  end(time: ITime): void {
    this.sourceEnded = true
    this.checkEnd(time)
  }

  error(time: ITime, e: any): void {
    // Don't set active = false - allow stream to continue after error
    this.sink.error(time, e)
  }

  endInner(time: ITime, inner: InnerSink<B>): void {
    const i = this.current.indexOf(inner)
    if (i >= 0) {
      this.current.splice(i, 1)
    }
    inner[Symbol.dispose]()

    if (this.pending.length > 0) {
      this.startInner(time, this.pending.shift()!)
    } else if (this.sourceEnded && this.current.length === 0) {
      this.sink.end(time)
    }
  }

  checkEnd(time: ITime): void {
    if (this.current.length === 0) {
      this.sink.end(time)
    }
  }

  [Symbol.dispose](): void {
    this.sourceEnded = true
    this.pending.length = 0
    const current = this.current.slice() // Copy array
    this.current.length = 0 // Clear before disposing

    for (let i = 0; i < current.length; i++) current[i][Symbol.dispose]()
  }
}

class InnerSink<A> implements ISink<A>, Disposable {
  disposable: Disposable = disposeNone

  constructor(
    readonly parentJoin: JoinSink<any, A>,
    readonly sink: ISink<A>
  ) {}

  event(time: ITime, x: A): void {
    this.sink.event(time, x)
  }

  end(time: ITime): void {
    this.parentJoin.endInner(time, this)
  }

  error(time: ITime, e: any): void {
    this.parentJoin.error(time, e)
  }

  [Symbol.dispose](): void {
    const d = this.disposable
    this.disposable = disposeNone // Clear before disposing to prevent circular disposal
    d[Symbol.dispose]()
  }
}

export interface IJoinMapCurry {
  <A, B>(f: (a: A) => IStream<B>, source: IStream<A>): IStream<B>
  <A, B>(f: (a: A) => IStream<B>): (source: IStream<A>) => IStream<B>
}

export interface IMergeConcurrentlyMapCurry {
  <A>(concurrency: number, stream: IStream<IStream<A>>): IStream<A>
  <A>(concurrency: number): (stream: IStream<IStream<A>>) => IStream<A>
}

export interface IMergeMapConcurrentlyCurry {
  <A, B>(f: (a: A) => IStream<B>, concurrency: number, stream: IStream<A>): IStream<B>
  <A, B>(f: (a: A) => IStream<B>, concurrency: number): (stream: IStream<A>) => IStream<B>
  <A, B>(f: (a: A) => IStream<B>): (concurrency: number) => (stream: IStream<A>) => IStream<B>
}
