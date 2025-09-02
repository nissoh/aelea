import type { IScheduler, ISink, IStream, ITime } from '../types.js'
import { disposeAll, disposeNone } from '../utils/disposable.js'
import { curry2, curry3 } from '../utils/function.js'

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
    return new Join(sink, scheduler, this.source, this.f, this.concurrency)
  }
}

export const join = <A>(stream: IStream<IStream<A>>): IStream<A> =>
  joinConcurrentlyMap(Number.POSITIVE_INFINITY, stream)

export const joinMap: IJoinMapCurry = curry2((f, source) => joinMapConcurrently(f, Number.POSITIVE_INFINITY, source))

export interface IJoinMapCurry {
  <A, B>(f: (a: A) => IStream<B>, source: IStream<A>): IStream<B>
  <A, B>(f: (a: A) => IStream<B>): (source: IStream<A>) => IStream<B>
}

export const joinConcurrentlyMap: IMergeConcurrentlyMapCurry = curry2((concurrency, stream) =>
  joinMapConcurrently(s => s, concurrency, stream)
)

export const joinMapConcurrently: IMergeMapConcurrentlyCurry = curry3(
  (f, concurrency, source) => new JoinMapConcurrently(f, concurrency, source)
)

class Join<A, B> implements ISink<A>, Disposable {
  readonly disposable: Disposable
  active = true
  readonly current: Inner<B>[] = []
  readonly pending: A[] = []

  constructor(
    readonly sink: ISink<B>,
    readonly scheduler: IScheduler,
    source: IStream<A>,
    readonly f: (a: A) => IStream<B>,
    readonly concurrency: number
  ) {
    this.disposable = source.run(this, scheduler)
  }

  event(time: ITime, x: A): void {
    if (this.current.length < this.concurrency) {
      this.startInner(time, x)
    } else {
      this.pending.push(x)
    }
  }

  startInner(time: ITime, value: A): void {
    try {
      const innerSink = new Inner(this, this.sink)
      const innerStream = this.f(value)
      innerSink.disposable = innerStream.run(innerSink, this.scheduler)
      this.current.push(innerSink)
    } catch (e) {
      this.error(time, e)
    }
  }

  end(time: ITime): void {
    this.active = false
    this.checkEnd(time)
  }

  error(time: ITime, e: any): void {
    // Don't set active = false - allow stream to continue after error
    this.sink.error(time, e)
  }

  endInner(time: ITime, inner: Inner<B>): void {
    const i = this.current.indexOf(inner)
    if (i >= 0) {
      this.current.splice(i, 1)
    }
    inner[Symbol.dispose]()

    if (this.pending.length > 0) {
      this.startInner(time, this.pending.shift()!)
    } else {
      this.checkEnd(time)
    }
  }

  checkEnd(time: ITime): void {
    if (!this.active && this.current.length === 0) {
      this.sink.end(time)
    }
  }

  [Symbol.dispose](): void {
    this.active = false
    this.pending.length = 0
    this.disposable[Symbol.dispose]()
    disposeAll(this.current)[Symbol.dispose]()
  }
}

class Inner<A> implements ISink<A>, Disposable {
  disposable: Disposable = disposeNone

  constructor(
    readonly parentJoin: Join<any, A>,
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
    this.disposable[Symbol.dispose]()
  }
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
