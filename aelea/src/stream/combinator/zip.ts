import { empty, now } from '../source/stream.js'
import type { IScheduler, ISink, IStream } from '../types.js'
import { disposeAll } from '../utils/disposable.js'
import { IndexSink } from '../utils/sink.js'
import { map } from './map.js'

/**
 * Stream that combines values from multiple streams into an object in lockstep
 */
class Zip<A> implements IStream<Readonly<A>> {
  readonly keys: (keyof A)[]
  readonly sources: IStream<any>[]

  constructor(state: { [P in keyof A]: IStream<A[P]> }) {
    this.keys = Object.keys(state) as (keyof A)[]
    this.sources = Object.values(state) as IStream<any>[]
  }

  run(sink: ISink<Readonly<A>>, scheduler: IScheduler): Disposable {
    const result = {} as A

    return zipMap(
      (...values) => {
        for (let i = 0; i < this.keys.length; i++) {
          result[this.keys[i]] = values[i]
        }
        return result as Readonly<A>
      },
      ...this.sources
    ).run(sink, scheduler)
  }
}

export function zip<A>(
  state: {
    [P in keyof A]: IStream<A[P]>
  }
): IStream<Readonly<A>> {
  const sources = Object.values(state)

  if (sources.length === 0) return now({} as A)

  return new Zip(state)
}

/**
 * Stream that combines values from multiple streams using a mapping function in lockstep
 */
class ZipMap<T extends readonly unknown[], R> implements IStream<R> {
  constructor(
    readonly f: (...args: T) => R,
    readonly sourceList: [...{ [K in keyof T]: IStream<T[K]> }]
  ) {}

  run(sink: ISink<R>, scheduler: IScheduler): Disposable {
    const l = this.sourceList.length
    const disposables = new Array(l)
    const sinks = new Array(l)
    const buffers = new Array(l)
    const zipSink = new ZipMapSink(this.f, buffers, sinks, sink)

    for (let i = 0; i < l; ++i) {
      buffers[i] = new Queue()
      const indexSink = (sinks[i] = new IndexSink(zipSink, i))
      disposables[i] = this.sourceList[i].run(indexSink, scheduler)
    }

    return disposeAll(disposables)
  }
}

/**
 * Combine values from multiple streams in lockstep
 *
 * streamA: -1---2---3------>
 * streamB: ---a---b---c---->
 * zipMap:  ---A---B---C---->
 *             |   |   |
 *             |   |   +-- [3,c]
 *             |   +-- [2,b]
 *             +-- [1,a]
 */
export function zipMap<T extends readonly unknown[], R>(
  f: (...args: T) => R,
  ...sourceList: [...{ [K in keyof T]: IStream<T[K]> }]
): IStream<R> {
  const l = sourceList.length

  if (l === 0) return empty
  if (l === 1) return map(f as any, sourceList[0])

  return new ZipMap(f, sourceList)
}

class Queue<T> {
  items: T[] = []

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

class ZipMapSink<I, O> implements ISink<IndexedValue<I | undefined>> {
  constructor(
    readonly f: (...args: any[]) => O,
    readonly buffers: ArrayLike<Queue<I>>,
    readonly sinks: ArrayLike<IndexSink<I>>,
    readonly sink: ISink<O>
  ) {}

  event(time: number, indexedValue: IndexedValue<I>): void {
    const i = indexedValue.index

    if (!indexedValue.active) {
      const buffer = this.buffers[i]
      if (buffer.isEmpty()) {
        this.sink.end(time)
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
        this.sink.event(time, result)
      } catch (error) {
        this.sink.error(time, error)
      }

      if (this.ended()) {
        this.sink.end(time)
      }
    }
  }

  error(time: number, e: any): void {
    this.sink.error(time, e)
  }

  end(time: number): void {
    // This should not be called directly as zipMap manages its own lifecycle
    // through activeCount tracking
    // If we reach here, it means all sources ended without errors
    this.sink.end(time)
  }

  ended(): boolean {
    for (let i = 0; i < this.buffers.length; i++) {
      if (this.buffers[i].isEmpty() && !this.sinks[i].active) {
        return true
      }
    }
    return false
  }

  ready(): boolean {
    for (let i = 0; i < this.buffers.length; i++) {
      if (this.buffers[i].isEmpty()) {
        return false
      }
    }
    return true
  }
}
