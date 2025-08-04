import { empty, now } from '../source/stream.js'
import { stream } from '../stream.js'
import type { IScheduler, ISink, IStream } from '../types.js'
import { disposeAll } from '../utils/disposable.js'
import { type IndexedValue, IndexSink } from '../utils/sink.js'
import { map } from './map.js'

export function combine<T extends readonly unknown[], R>(
  f: (...args: T) => R,
  ...sources: [...{ [K in keyof T]: IStream<T[K]> }]
): IStream<R> {
  const l = sources.length

  if (l === 0) return empty
  if (l === 1) return map(f as any, sources[0])

  return stream((scheduler: IScheduler, sink: ISink<R>) => {
    const disposables = new Array(l)
    const sinks = new Array(l)
    const mergeSink = new CombineSink(disposables, sinks.length, sink, f)

    for (let indexSink: IndexSink<any>, i = 0; i < l; ++i) {
      indexSink = sinks[i] = new IndexSink(mergeSink, i)
      disposables[i] = sources[i].run(scheduler, indexSink)
    }

    return disposeAll(disposables)
  })
}

export function combineState<A>(
  state: {
    [P in keyof A]: IStream<A[P]>
  }
): IStream<Readonly<A>> {
  const keys = Object.keys(state) as (keyof A)[]
  const sources = Object.values(state) as IStream<any>[]
  const l = sources.length

  if (l === 0) return now({} as A)

  return stream((scheduler, sink) => {
    const result = {} as A

    return combine(
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

class CombineSink<I, O> implements ISink<IndexedValue<I | undefined>> {
  awaiting: number
  readonly values: any[]
  readonly hasValue: boolean[]
  activeCount: number

  constructor(
    readonly disposables: Disposable[],
    sinkCount: number,
    protected readonly sink: ISink<O>,
    readonly f: (...args: any[]) => O
  ) {
    this.awaiting = this.activeCount = sinkCount
    this.values = new Array(sinkCount)
    this.hasValue = new Array(sinkCount).fill(false)
  }

  event(indexedValue: IndexedValue<I>): void {
    const i = indexedValue.index

    if (!indexedValue.active) {
      this.disposables[i][Symbol.dispose]()
      if (--this.activeCount === 0) {
        this.sink.end()
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
      this.sink.event(this.f(...this.values))
    }
  }

  error(e: any): void {
    this.sink.error(e)
  }

  end(): void {
    // This should not be called directly as combine manages its own lifecycle
    // through activeCount tracking
    // If we reach here, it means all sources ended without errors
    this.sink.end()
  }
}
