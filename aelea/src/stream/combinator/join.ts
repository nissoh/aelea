import type { IScheduler, ISink, IStream, ITime } from '../types.js'
import { disposeBoth, disposeNone } from '../utils/disposable.js'
import { curry2, curry3 } from '../utils/function.js'

const identity = <T>(x: T): T => x

/**
 * Flatten a stream of streams, running every inner concurrently
 *
 * stream of streams: -A--B--|
 *           A:       -a-b---c|
 *           B:          -d-e-|
 * join:              -a-b-d-e-c|
 */
export const join = <A>(stream: IStream<IStream<A>>): IStream<A> => joinConcurrently(Number.POSITIVE_INFINITY, stream)

export const joinMap: IJoinMapCurry = curry2((f, source) => joinMapConcurrently(f, Number.POSITIVE_INFINITY, source))

/**
 * Flatten a stream of streams, running at most `concurrency` inners at once;
 * further inners queue until a running one ends
 */
export const joinConcurrently: IJoinConcurrentlyCurry = curry2((concurrency, stream) =>
  joinMapConcurrently(identity, concurrency, stream)
)

export const joinMapConcurrently: IJoinMapConcurrentlyCurry = curry3(
  (f, concurrency, source) => new JoinMapConcurrently(f, concurrency, source)
)

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
  ended = false
  disposed = false
  readonly current: InnerSink<B>[] = []
  readonly pending: A[] = []

  constructor(
    readonly sink: ISink<B>,
    readonly scheduler: IScheduler,
    readonly f: (a: A) => IStream<B>,
    readonly concurrency: number
  ) {}

  event(time: ITime, x: A): void {
    if (this.disposed || this.ended) return
    if (this.current.length < this.concurrency) {
      this.startInner(time, x)
    } else {
      this.pending.push(x)
    }
  }

  startInner(time: ITime, value: A): void {
    const innerSink = new InnerSink(this, this.sink)
    let d: Disposable
    try {
      d = this.f(value).run(innerSink, this.scheduler)
    } catch (error) {
      this.sink.error(time, error)
      return
    }
    if (innerSink.disposed) {
      d[Symbol.dispose]()
    } else {
      innerSink.disposable = d
      this.current.push(innerSink)
    }
  }

  end(time: ITime): void {
    if (this.disposed || this.ended) return
    this.sourceEnded = true
    if (this.current.length === 0) this.finish(time)
  }

  error(time: ITime, e: unknown): void {
    if (this.disposed) return
    this.sink.error(time, e)
  }

  endInner(time: ITime, inner: InnerSink<B>): void {
    if (this.disposed || this.ended) return
    const i = this.current.indexOf(inner)
    if (i >= 0) this.current.splice(i, 1)
    inner[Symbol.dispose]()

    while (this.pending.length > 0 && this.current.length < this.concurrency) {
      this.startInner(time, this.pending.shift()!)
    }
    if (this.sourceEnded && this.current.length === 0) this.finish(time)
  }

  finish(time: ITime): void {
    this.ended = true
    this.sink.end(time)
  }

  [Symbol.dispose](): void {
    if (this.disposed) return
    this.disposed = true
    this.pending.length = 0
    const current = this.current.slice()
    this.current.length = 0

    for (let i = 0; i < current.length; i++) current[i][Symbol.dispose]()
  }
}

class InnerSink<A> implements ISink<A>, Disposable {
  disposable: Disposable = disposeNone
  disposed = false

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

  error(time: ITime, e: unknown): void {
    this.parentJoin.error(time, e)
  }

  [Symbol.dispose](): void {
    if (this.disposed) return
    this.disposed = true
    const d = this.disposable
    this.disposable = disposeNone
    d[Symbol.dispose]()
  }
}

export interface IJoinMapCurry {
  <A, B>(f: (a: A) => IStream<B>, source: IStream<A>): IStream<B>
  <A, B>(f: (a: A) => IStream<B>): (source: IStream<A>) => IStream<B>
}

export interface IJoinConcurrentlyCurry {
  <A>(concurrency: number, stream: IStream<IStream<A>>): IStream<A>
  <A>(concurrency: number): (stream: IStream<IStream<A>>) => IStream<A>
}

export interface IJoinMapConcurrentlyCurry {
  <A, B>(f: (a: A) => IStream<B>, concurrency: number, stream: IStream<A>): IStream<B>
  <A, B>(f: (a: A) => IStream<B>, concurrency: number): (stream: IStream<A>) => IStream<B>
  <A, B>(f: (a: A) => IStream<B>): (concurrency: number) => (stream: IStream<A>) => IStream<B>
}
