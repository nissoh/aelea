import { disposeAll, disposeNone } from '../disposable.js'
import { curry2, curry3 } from '../function.js'
import type { IStream, Scheduler, Sink } from '../types.js'

/**
 * Monadic join. Flatten a Stream<Stream<X>> to Stream<X> by merging inner
 * streams to the outer. Event arrival times are preserved.
 * @param stream stream of streams
 * @returns new stream containing all events of all inner streams
 */
export const join = <A>(stream: IStream<IStream<A>>): IStream<A> => mergeConcurrently(Number.POSITIVE_INFINITY, stream)

export interface IMergeConcurrentlyCurry {
  <A>(concurrency: number, stream: IStream<IStream<A>>): IStream<A>
  <A>(concurrency: number): (stream: IStream<IStream<A>>) => IStream<A>
}

/**
 * Merge a stream of streams concurrently up to a given limit
 */
export const mergeConcurrently: IMergeConcurrentlyCurry = curry2(
  <A>(concurrency: number, stream: IStream<IStream<A>>) =>
    mergeMapConcurrently((s: IStream<A>) => s, concurrency, stream)
)

export interface IMergeMapConcurrentlyCurry {
  <A, B>(f: (a: A) => IStream<B>, concurrency: number, stream: IStream<A>): IStream<B>
  <A, B>(f: (a: A) => IStream<B>, concurrency: number): (stream: IStream<A>) => IStream<B>
  <A, B>(f: (a: A) => IStream<B>): (concurrency: number) => (stream: IStream<A>) => IStream<B>
}

/**
 * Map each value in the stream to a new stream, and merge them concurrently
 * up to a given limit. Event arrival times are preserved.
 */
export const mergeMapConcurrently: IMergeMapConcurrentlyCurry = curry3(
  <A, B>(f: (a: A) => IStream<B>, concurrency: number, stream: IStream<A>) => ({
    run(scheduler, sink) {
      return new Outer(f, concurrency, stream, sink, scheduler)
    }
  })
)

class Outer<A, B> implements Sink<A>, Disposable {
  private readonly scheduler: Scheduler
  private readonly disposable: Disposable
  private active: boolean
  private readonly concurrency: number
  private readonly f: (a: A) => IStream<B>
  private readonly sink: Sink<B>
  private readonly current: Inner<B>[]
  private readonly pending: A[]

  constructor(f: (a: A) => IStream<B>, concurrency: number, source: IStream<A>, sink: Sink<B>, scheduler: Scheduler) {
    this.f = f
    this.concurrency = concurrency
    this.sink = sink
    this.scheduler = scheduler
    this.pending = []
    this.current = []
    this.active = true
    this.disposable = source.run(scheduler, this)
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
    innerSink.disposable = innerStream.run(this.scheduler, innerSink)
    this.current.push(innerSink)
  }

  end(): void {
    this.active = false
    this.checkEnd()
  }

  error(e: any): void {
    this.active = false
    this.sink.error(e)
  }

  [Symbol.dispose](): void {
    this.active = false
    this.pending.length = 0
    this.disposable[Symbol.dispose]()
    disposeAll(this.current)[Symbol.dispose]()
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
}

class Inner<A> implements Sink<A>, Disposable {
  private readonly outer: Outer<any, A>
  disposable: Disposable
  private readonly sink: Sink<A>

  constructor(outer: Outer<any, A>, sink: Sink<A>) {
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
