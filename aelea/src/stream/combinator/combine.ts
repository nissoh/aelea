import { toStream } from '../common.js'
import { disposeAll, tryDispose } from '../disposable.js'
import { type IndexedValue, IndexSink, TransformSink } from '../sink.js'
import { now } from '../source/now.js'
import type { Disposable, IStream, Scheduler, Sink } from '../types.js'

export function combine<T extends readonly unknown[], R>(
  f: (...args: T) => R,
  sources: { [K in keyof T]: IStream<T[K]> }
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

export function combineState<A, K extends keyof A = keyof A>(
  state: {
    [P in keyof A]: IStream<A[P]> | A[P]
  }
): IStream<A> {
  const entries = Object.entries(state) as [keyof A, IStream<A[K]> | A[K]][]

  if (entries.length === 0) {
    return now({} as A)
  }

  const keys = entries.map(([key]) => key)
  const streams = entries.map(([_, stream]) => toStream(stream))

  return combine(
    (values: A[K][]) => {
      const result = values.reduce((seed, val, idx) => {
        seed[keys[idx]] = val
        return seed
      }, {} as A)
      return result
    },
    // @ts-ignore
    ...streams
  )
}

class CombineSink<A, B> extends TransformSink<IndexedValue<A>, B> implements Sink<IndexedValue<A>> {
  private readonly disposables: Disposable[]
  private readonly f: (...args: any[]) => B
  private awaiting: number
  private readonly hasValue: boolean[]
  private readonly values: any[]

  constructor(disposables: Disposable[], length: number, sink: Sink<B>, f: (...args: any[]) => B) {
    super(sink)
    this.disposables = disposables
    this.f = f

    this.awaiting = length
    this.values = new Array(length)
    this.hasValue = new Array(length).fill(false)
    this.activeCount = length
  }

  event(indexedValue: IndexedValue<A>): void {
    if (!indexedValue.active) {
      this.dispose(indexedValue.index)
      return
    }

    const i = indexedValue.index
    const awaiting = this.updateReady(i)

    this.values[i] = indexedValue.value
    if (awaiting === 0) {
      this.sink.event(invoke(this.f, this.values))
    }
  }

  private updateReady(index: number): number {
    if (this.awaiting > 0) {
      if (!this.hasValue[index]) {
        this.hasValue[index] = true
        this.awaiting -= 1
      }
    }
    return this.awaiting
  }

  private dispose(index: number): void {
    tryDispose(this.disposables[index], this.sink)
    if (--this.activeCount === 0) {
      this.sink.end()
    }
  }
}

/**
 * TODO: find a better way (without `any`)
 */
function invoke<F extends (...args: any[]) => any>(f: F, args: Parameters<F>): ReturnType<F> {
  switch (args.length) {
    case 0:
      return f()
    case 1:
      return f(args[0])
    case 2:
      return f(args[0], args[1])
    case 3:
      return f(args[0], args[1], args[2])
    case 4:
      return f(args[0], args[1], args[2], args[3])
    case 5:
      return f(args[0], args[1], args[2], args[3], args[4])
    default:
      return f.apply(undefined, args)
  }
}
