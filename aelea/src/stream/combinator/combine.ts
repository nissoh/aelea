import { just } from '../source/just.js'
import { empty } from '../source/void.js'
import type { IScheduler, ISink, IStream, Time } from '../types.js'
import { disposeAll } from '../utils/disposable.js'
import { type IndexedValue, IndexSink } from '../utils/sink.js'
import { map } from './map.js'

/**
 * Combine latest values from multiple streams whenever any stream emits
 *
 * streamA:    -1---2|
 * streamB:    ---a---b-c---->
 * combineMap: ---A-B-C-D---->
 *                | | | |
 *                | | | +-- [2,c]
 *                | | +-- [2,b]
 *                | +-- [2,a]
 *                +-- [1,a]
 */
export function combineMap<T extends readonly unknown[], R>(
  f: (...args: T) => R,
  ...sources: [...{ [K in keyof T]: IStream<T[K]> }]
): IStream<R> {
  const l = sources.length

  if (l === 0) return empty
  if (l === 1) return map(f as any, sources[0])

  return new CombineMap(f, sources)
}

/**
 * Combine multiple streams into an object stream
 *
 * temperature: -a-b-c->
 * humidity:    -x-y-z->
 * combine:     -A-B-C->
 *               | | |
 *               | | +-- {temp:b,humidity:y}
 *               | +-- {temp:b,humidity:x}
 *               +-- {temp:a,humidity:x}
 */
export function combine<A>(
  state: {
    [P in keyof A]: IStream<A[P]>
  }
): IStream<Readonly<A>> {
  const l = Object.keys(state).length

  if (l === 0) return just({})

  return new Combine(state)
}

/**
 * Stream that combines multiple streams into an object stream
 */
class Combine<A> implements IStream<Readonly<A>> {
  readonly combineMap: CombineMap<any[], Readonly<A>>

  constructor(state: { [P in keyof A]: IStream<A[P]> }) {
    const keys = Object.keys(state) as (keyof A)[]
    const sources = Object.values(state) as IStream<any>[]
    const result = {} as A

    this.combineMap = new CombineMap((...values: any[]) => {
      for (let i = 0; i < keys.length; i++) {
        result[keys[i]] = values[i]
      }
      return result as Readonly<A>
    }, sources)
  }

  run(sink: ISink<Readonly<A>>, scheduler: IScheduler): Disposable {
    return this.combineMap.run(sink, scheduler)
  }
}

/**
 * Stream that combines latest values from multiple streams using a mapping function
 */
class CombineMap<T extends readonly unknown[], R> implements IStream<R> {
  constructor(
    readonly f: (...args: T) => R,
    readonly sources: [...{ [K in keyof T]: IStream<T[K]> }]
  ) {}

  run(sink: ISink<R>, scheduler: IScheduler): Disposable {
    const l = this.sources.length
    const disposables = new Array(l)
    const mergeSink = new CombineMapSink(disposables, l, sink, this.f)

    for (let i = 0; i < l; i++) {
      const indexSink = new IndexSink(mergeSink, i)
      disposables[i] = this.sources[i].run(indexSink, scheduler)
    }

    return disposeAll(disposables)
  }
}

class CombineMapSink<I, O> implements ISink<IndexedValue<I | undefined>> {
  awaiting: number
  readonly values: any[]
  readonly hasValue: boolean[]
  activeCount: number

  constructor(
    readonly disposables: Disposable[],
    sinkCount: number,
    readonly sink: ISink<O>,
    readonly f: (...args: any[]) => O
  ) {
    this.awaiting = this.activeCount = sinkCount
    this.values = new Array(sinkCount)
    this.hasValue = new Array(sinkCount)
    for (let i = 0; i < sinkCount; i++) this.hasValue[i] = false
  }

  event(time: Time, indexedValue: IndexedValue<I>): void {
    const i = indexedValue.index

    if (indexedValue.ended) {
      this.disposables[i][Symbol.dispose]()
      if (--this.activeCount === 0) {
        this.sink.end(time)
      }
      return
    }

    if (this.awaiting > 0 && !this.hasValue[i]) {
      this.hasValue[i] = true
      this.awaiting--
    }

    this.values[i] = indexedValue.value
    if (this.awaiting === 0) {
      this.sink.event(time, this.f(...this.values))
    }
  }

  error(time: Time, e: any): void {
    this.sink.error(time, e)
  }

  end(time: Time): void {
    // This should not be called directly as combineMap manages its own lifecycle
    // through activeCount tracking
    this.sink.end(time)
  }
}
