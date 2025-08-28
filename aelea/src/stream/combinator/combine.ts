import { empty, now } from '../source/stream.js'
import type { IScheduler, ISink, IStream } from '../types.js'
import { disposeAll } from '../utils/disposable.js'
import { type IndexedValue, IndexSink } from '../utils/sink.js'
import { map } from './map.js'

/**
 * Combine multiple streams into an object stream
 *
 * temperature: -20-21-22-23->
 * humidity:    -45-46-47-48->
 * combine({
 *   temp: temperature,
 *   humidity: humidity
 * }):          -{temp:20,humidity:45}-{temp:21,humidity:45}-{temp:21,humidity:46}->
 */
export function combine<A>(
  state: {
    [P in keyof A]: IStream<A[P]>
  }
): IStream<Readonly<A>> {
  const l = Object.keys(state).length

  if (l === 0) return now({} as A)

  return new Combine(state)
}
/**
 * Combine latest values from multiple streams whenever any stream emits
 *
 * streamA:    -1---2-------3->
 * streamB:    ---a---b-c------>
 * combineMap: ---[1,a]-[2,a]-[2,b]-[2,c]-[3,c]->
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
 * Stream that combines multiple streams into an object stream
 */
class Combine<A> implements IStream<Readonly<A>> {
  readonly keys: (keyof A)[]
  readonly sources: IStream<any>[]

  constructor(state: { [P in keyof A]: IStream<A[P]> }) {
    this.keys = Object.keys(state) as (keyof A)[]
    this.sources = Object.values(state) as IStream<any>[]
  }

  run(sink: ISink<Readonly<A>>, scheduler: IScheduler): Disposable {
    const result = {} as A

    return combineMap(
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
    const sinks = new Array(l)
    const mergeSink = new CombineMapSink(disposables, sinks.length, sink, this.f)

    for (let indexSink: IndexSink<any>, i = 0; i < l; ++i) {
      indexSink = sinks[i] = new IndexSink(mergeSink, i)
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
    this.hasValue = new Array(sinkCount).fill(false)
  }

  event(time: number, indexedValue: IndexedValue<I>): void {
    const i = indexedValue.index

    if (!indexedValue.active) {
      this.disposables[i][Symbol.dispose]()
      if (--this.activeCount === 0) {
        this.sink.end(time)
      }
      return
    }

    if (this.awaiting > 0) {
      if (!this.hasValue[i]) {
        this.hasValue[i] = true
        this.awaiting -= 1
      }
    }

    this.values[i] = indexedValue.value
    if (this.awaiting === 0) {
      this.sink.event(time, this.f(...this.values))
    }
  }

  error(time: number, e: any): void {
    this.sink.error(time, e)
  }

  end(time: number): void {
    // This should not be called directly as combineMap manages its own lifecycle
    // through activeCount tracking
    // If we reach here, it means all sources ended without errors
    this.sink.end(time)
  }
}
