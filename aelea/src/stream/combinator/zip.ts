import { empty, now } from '../source/stream.js'
import { stream } from '../stream.js'
import type { ISink, IStream } from '../types.js'
import { disposeAll } from '../utils/disposable.js'
import { IndexSink } from '../utils/sink.js'
import { map } from './map.js'

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

export function zip<T extends readonly unknown[], R>(
  f: (...args: T) => R,
  ...sourceList: [...{ [K in keyof T]: IStream<T[K]> }]
): IStream<R> {
  const l = sourceList.length

  if (l === 0) return empty
  if (l === 1) return map(f as any, sourceList[0])

  return stream((scheduler, sink) => {
    const disposables = new Array(l)
    const sinks = new Array(l)
    const buffers = new Array(l)

    const zipSink = new ZipSink(f, buffers, sinks, sink)

    for (let i = 0; i < l; ++i) {
      buffers[i] = new Queue()
      const indexSink = (sinks[i] = new IndexSink(zipSink, i))
      disposables[i] = sourceList[i].run(scheduler, indexSink)
    }

    return disposeAll(disposables)
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

class ZipSink<I, O> implements ISink<IndexedValue<I | undefined>> {
  constructor(
    private readonly f: (...args: any[]) => O,
    private readonly buffers: ArrayLike<Queue<I>>,
    private readonly sinks: ArrayLike<IndexSink<I>>,
    private readonly sink: ISink<O>
  ) {}

  event(indexedValue: IndexedValue<I>): void {
    const i = indexedValue.index

    if (!indexedValue.active) {
      const buffer = this.buffers[i]
      if (buffer.isEmpty()) {
        this.sink.end()
      }
      return
    }

    const buffers = this.buffers
    const buffer = buffers[indexedValue.index]

    buffer.push(indexedValue.value)

    if (buffer.length() === 1) {
      if (!this.ready()) {
        return
      }

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

      if (this.ended()) {
        this.sink.end()
      }
    }
  }

  error(e: any): void {
    this.sink.error(e)
  }

  end(): void {
    // This should not be called directly as zip manages its own lifecycle
    // through activeCount tracking
    // If we reach here, it means all sources ended without errors
    this.sink.end()
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
