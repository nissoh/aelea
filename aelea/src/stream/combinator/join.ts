import { stream } from '../stream.js'
import type { IScheduler, ISink, IStream } from '../types.js'
import { disposeAll, disposeNone } from '../utils/disposable.js'
import { curry2, curry3 } from '../utils/function.js'

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

export const joinMapConcurrently: IMergeMapConcurrentlyCurry = curry3((f, concurrency, source) =>
  stream((sink, scheduler) => new Join(sink, scheduler, source, f, concurrency))
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

  event(x: A): void {
    this.addInner(x)
  }

  addInner(x: A): void {
    if (this.current.length < this.concurrency) {
      this.startInner(x)
    } else {
      this.pending.push(x)
    }
  }

  startInner(x: A): void {
    try {
      this.initInner(x)
    } catch (e) {
      this.error(e)
    }
  }

  initInner(x: A): void {
    const innerSink = new Inner(this, this.sink)
    const innerStream = this.f(x)
    innerSink.disposable = innerStream.run(innerSink, this.scheduler)
    this.current.push(innerSink)
  }

  end(): void {
    this.active = false
    this.checkEnd()
  }

  error(e: any): void {
    // Don't set active = false - allow stream to continue after error
    this.sink.error(e)
  }
  endInner(inner: Inner<B>): void {
    const i = this.current.indexOf(inner)
    if (i >= 0) {
      this.current.splice(i, 1)
    }
    inner[Symbol.dispose]()

    if (this.pending.length > 0) {
      this.startInner(this.pending.shift()!)
    } else {
      this.checkEnd()
    }
  }

  checkEnd(): void {
    if (!this.active && this.current.length === 0) {
      this.sink.end()
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

  event(x: A): void {
    this.sink.event(x)
  }

  end(): void {
    this.parentJoin.endInner(this)
  }

  error(e: any): void {
    this.parentJoin.error(e)
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
