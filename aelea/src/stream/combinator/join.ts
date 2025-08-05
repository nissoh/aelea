import { stream } from '../stream.js'
import type { IScheduler, ISink, IStream } from '../types.js'
import { disposeAll, disposeNone } from '../utils/disposable.js'
import { curry2, curry3 } from '../utils/function.js'

export const join = <A>(stream: IStream<IStream<A>>): IStream<A> =>
  mergeConcurrentlyMap(Number.POSITIVE_INFINITY, stream)

export const mergeConcurrentlyMap: IMergeConcurrentlyMapCurry = curry2((concurrency, stream) =>
  mergeMapConcurrently(s => s, concurrency, stream)
)

export const mergeMapConcurrently: IMergeMapConcurrentlyCurry = curry3((f, concurrency, source) =>
  stream((sink, scheduler) => new Outer(f, concurrency, source, sink, scheduler))
)

class Outer<A, B> implements ISink<A>, Disposable {
  private readonly scheduler: IScheduler
  private readonly disposable: Disposable
  private active: boolean
  private readonly concurrency: number
  private readonly f: (a: A) => IStream<B>
  private readonly sink: ISink<B>
  private readonly current: Inner<B>[]
  private readonly pending: A[]

  constructor(f: (a: A) => IStream<B>, concurrency: number, source: IStream<A>, sink: ISink<B>, scheduler: IScheduler) {
    this.f = f
    this.concurrency = concurrency
    this.sink = sink
    this.scheduler = scheduler
    this.pending = []
    this.current = []
    this.active = true
    this.disposable = source.run(this, scheduler)
  }

  event(x: A): void {
    this.addInner(x)
  }

  private addInner(x: A): void {
    if (this.current.length < this.concurrency) {
      this.startInner(x)
    } else {
      this.pending.push(x)
    }
  }

  private startInner(x: A): void {
    try {
      this.initInner(x)
    } catch (e) {
      this.error(e)
    }
  }

  private initInner(x: A): void {
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

  private checkEnd(): void {
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
  private readonly outer: Outer<any, A>
  disposable: Disposable
  private readonly sink: ISink<A>

  constructor(outer: Outer<any, A>, sink: ISink<A>) {
    this.outer = outer
    this.sink = sink
    this.disposable = disposeNone
  }

  event(x: A): void {
    this.sink.event(x)
  }

  end(): void {
    this.outer.endInner(this)
  }

  error(e: any): void {
    this.outer.error(e)
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
