import { disposeAll, tryDispose } from '../disposable.js'
import { type IndexedValue, IndexSink } from '../sink.js'
import { now } from '../source/now.js'
import type { IStream, Scheduler, Sink } from '../types.js'

export function combine<T extends readonly unknown[], R>(
  f: (...args: T) => R,
  ...sources: [...{ [K in keyof T]: IStream<T[K]> }]
): IStream<R> {
  return {
    run(scheduler: Scheduler, sink: Sink<R>): Disposable {
      const l = sources.length
      const disposables = new Array(l)
      const sinks = new Array(l)

      const mergeSink = new CombineSink(disposables, sinks.length, sink, f)

      for (let indexSink: IndexSink<any>, i = 0; i < l; ++i) {
        indexSink = sinks[i] = new IndexSink(mergeSink, i)
        disposables[i] = sources[i].run(scheduler, indexSink)
      }

      return disposeAll(disposables)
    }
  }
}

export function combineState<A>(
  state: {
    [P in keyof A]: IStream<A[P]>
  }
): IStream<Readonly<A>> {
  const keys = Object.keys(state) as (keyof A)[]
  const sources = Object.values(state) as IStream<any>[]

  if (sources.length === 0) {
    return now({} as A)
  }

  return {
    run(scheduler, sink) {
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
    }
  }
}

class CombineSink<A, B> implements Sink<IndexedValue<A>> {
  awaiting: number
  readonly values: any[]
  readonly hasValue: boolean[]
  activeCount: number

  constructor(
    readonly disposables: Disposable[],
    readonly sinkCount: number,
    protected readonly sink: Sink<B>,
    readonly f: (...args: any[]) => B
  ) {
    this.awaiting = this.activeCount = sinkCount
    this.values = new Array(sinkCount)
    this.hasValue = new Array(sinkCount).fill(false)
  }

  event(indexedValue: IndexedValue<A>): void {
    if (!indexedValue.active) {
      tryDispose(this.disposables[indexedValue.index], this.sink)
      if (--this.activeCount === 0) {
        this.sink.end()
      }
      return
    }

    const i = indexedValue.index
    this.values[i] = indexedValue.value

    if (!this.hasValue[i]) {
      this.hasValue[i] = true
      this.awaiting--
    }

    if (this.awaiting === 0) {
      try {
        this.sink.event(this.f(...this.values))
      } catch (error) {
        this.sink.error(error)
      }
    }
  }

  error(error: any): void {
    this.sink.error(error)
  }

  end(): void {
    this.sink.end()
  }
}
