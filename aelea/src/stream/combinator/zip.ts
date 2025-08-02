import { empty } from '../source/stream.js'
import type { IStream, Scheduler, Sink } from '../types.js'
import { disposeAll } from '../utils/disposable.js'
import { curry2, curry3 } from '../utils/function.js'
import { map } from './map.js'

export const zip: IZipCurry = curry3(<A, B, R>(f: (a: A, b: B) => R, stream1: IStream<A>, stream2: IStream<B>) =>
  zipArray(f, [stream1, stream2])
)

export const zipArray: IZipArrayCurry = curry2((f, streams) => {
  if (streams.length === 0) return empty
  if (streams.length === 1) return map(f, streams[0])

  return new Zip(f, streams)
})

export interface IZipCurry {
  <A, B, R>(f: (a: A, b: B) => R, stream1: IStream<A>, stream2: IStream<B>): IStream<R>
  <A, B, R>(f: (a: A, b: B) => R, stream1: IStream<A>): (stream2: IStream<B>) => IStream<R>
  <A, B, R>(f: (a: A, b: B) => R): (stream1: IStream<A>) => (stream2: IStream<B>) => IStream<R>
}

export interface IZipArrayCurry {
  <Args extends unknown[], R>(f: (...args: Args) => R, streams: { [K in keyof Args]: IStream<Args[K]> }): IStream<R>
  <Args extends unknown[], R>(f: (...args: Args) => R): (streams: { [K in keyof Args]: IStream<Args[K]> }) => IStream<R>
}

class Queue<T> {
  private items: T[] = []

  push(item: T): void {
    this.items.push(item)
  }

  shift(): T | undefined {
    return this.items.shift()
  }

  isEmpty(): boolean {
    return this.items.length === 0
  }

  length(): number {
    return this.items.length
  }
}

interface IndexedValue<T> {
  index: number
  value: T
  active: boolean
}

class IndexSink<T> implements Sink<T> {
  active = true

  constructor(
    private readonly index: number,
    private readonly sink: Sink<IndexedValue<T>>
  ) {}

  event(value: T): void {
    if (this.active) {
      this.sink.event({ index: this.index, value, active: true })
    }
  }

  error(e: any): void {
    this.sink.error(e)
  }

  end(): void {
    if (this.active) {
      this.active = false
      this.sink.event({ index: this.index, value: undefined as any, active: false })
    }
  }
}

class Zip<A, R> implements IStream<R> {
  constructor(
    private readonly f: (...args: A[]) => R,
    private readonly sources: ArrayLike<IStream<A>>
  ) {}

  run(scheduler: Scheduler, sink: Sink<R>): Disposable {
    const l = this.sources.length
    const disposables = new Array(l)
    const sinks = new Array(l)
    const buffers = new Array(l)

    const zipSink = new ZipSink(this.f, buffers, sinks, sink)

    for (let i = 0; i < l; ++i) {
      buffers[i] = new Queue<A>()
      const indexSink = (sinks[i] = new IndexSink(i, zipSink))
      disposables[i] = this.sources[i].run(scheduler, indexSink)
    }

    return disposeAll(disposables)
  }
}

class ZipSink<A, R> implements Sink<IndexedValue<A>> {
  constructor(
    private readonly f: (...args: A[]) => R,
    private readonly buffers: ArrayLike<Queue<A>>,
    private readonly sinks: ArrayLike<IndexSink<A>>,
    private readonly sink: Sink<R>
  ) {}

  event(indexedValue: IndexedValue<A>): void {
    if (!indexedValue.active) {
      this.dispose(indexedValue.index)
      return
    }

    const buffers = this.buffers
    const buffer = buffers[indexedValue.index]

    buffer.push(indexedValue.value)

    if (buffer.length() === 1) {
      if (!this.ready()) {
        return
      }

      this.emitZipped()

      if (this.ended()) {
        this.sink.end()
      }
    }
  }

  error(e: any): void {
    this.sink.error(e)
  }

  end(): void {
    // Individual streams handle their own end
  }

  private dispose(index: number): void {
    const buffer = this.buffers[index]
    if (buffer.isEmpty()) {
      this.sink.end()
    }
  }

  private emitZipped(): void {
    const values = []
    for (let i = 0; i < this.buffers.length; i++) {
      values.push(this.buffers[i].shift()!)
    }
    try {
      const result = this.f(...values)
      this.sink.event(result)
    } catch (error) {
      this.sink.error(error)
    }
  }

  private ended(): boolean {
    for (let i = 0; i < this.buffers.length; i++) {
      if (this.buffers[i].isEmpty() && !this.sinks[i].active) {
        return true
      }
    }
    return false
  }

  private ready(): boolean {
    for (let i = 0; i < this.buffers.length; i++) {
      if (this.buffers[i].isEmpty()) {
        return false
      }
    }
    return true
  }
}
