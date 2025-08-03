import { empty, now } from '../source/stream.js'
import { stream } from '../stream.js'
import type { ISink, IStream } from '../types.js'
import { disposeAll } from '../utils/disposable.js'
import { map } from './map.js'

export function zip<T extends readonly unknown[], R>(
  f: (...args: T) => R,
  ...sources: [...{ [K in keyof T]: IStream<T[K]> }]
): IStream<R> {
  if (sources.length === 0) return empty
  if (sources.length === 1) return map(f as any, sources[0])

  return stream((scheduler, sink) => {
    const l = sources.length
    const disposables = new Array(l)
    const sinks = new Array(l)
    const buffers = new Array(l)

    const zipSink = new ZipSink(f, buffers, sinks, sink)

    for (let i = 0; i < l; ++i) {
      buffers[i] = new Queue()
      const indexSink = (sinks[i] = new IndexSink(i, zipSink))
      disposables[i] = sources[i].run(scheduler, indexSink)
    }

    return disposeAll(disposables)
  })
}

export function zipState<A>(
  state: {
    [P in keyof A]: IStream<A[P]>
  }
): IStream<Readonly<A>> {
  const keys = Object.keys(state) as (keyof A)[]
  const sources = Object.values(state) as IStream<any>[]

  if (sources.length === 0) {
    return now({} as A)
  }

  return stream((scheduler, sink) => {
    const result = {} as A

    return zip(
      (...values) => {
        for (let i = 0; i < keys.length; i++) {
          result[keys[i]] = values[i]
        }
        return result as Readonly<A>
      },
      ...sources
    ).run(scheduler, sink)
  })
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

class IndexSink<T> implements ISink<T> {
  active = true

  constructor(
    private readonly index: number,
    private readonly sink: ISink<IndexedValue<T>>
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

class ZipSink<A, R> implements ISink<IndexedValue<A>> {
  constructor(
    private readonly f: (...args: any[]) => R,
    private readonly buffers: ArrayLike<Queue<A>>,
    private readonly sinks: ArrayLike<IndexSink<A>>,
    private readonly sink: ISink<R>
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
