import { empty } from '../source/void.js'
import type { IScheduler, ISink, IStream, Time } from '../types.js'
import { disposeAll } from '../utils/disposable.js'
import { type IndexedValue, IndexSink } from '../utils/sink.js'

/**
 * Stream that merges multiple streams into one, emitting values as they arrive
 */
class Merge<T> implements IStream<T> {
  constructor(readonly sourceList: readonly IStream<T>[]) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    const l = this.sourceList.length
    const disposables = new Array<Disposable>(l)
    const sinks: ISink<unknown>[] = new Array(l)
    const mergeSink = new MergeSink(sink, disposables, l)

    for (let indexSink: IndexSink<any>, i = 0; i < l; ++i) {
      indexSink = sinks[i] = new IndexSink(mergeSink, i)
      disposables[i] = this.sourceList[i].run(indexSink, scheduler)
    }

    return disposeAll(disposables)
  }
}

/**
 * Merge multiple streams into one, emitting values as they arrive
 *
 * streamA: -1---3---5->
 * streamB: --2---4---6->
 * merge:   -1-2-3-4-5-6->
 */
export function merge<T extends readonly unknown[]>(
  ...sourceList: readonly [...{ [K in keyof T]: IStream<T[K]> }]
): IStream<T[number]> {
  const l = sourceList.length

  if (l === 0) return empty
  if (l === 1) return sourceList[0]

  return new Merge(sourceList as readonly IStream<T[number]>[])
}

class MergeSink<A> implements ISink<IndexedValue<A | undefined>> {
  constructor(
    readonly sink: ISink<A | undefined>,
    public disposables: Disposable[],
    public activeCount: number
  ) {}

  event(time: Time, indexValue: IndexedValue<A | undefined>): void {
    if (indexValue.ended) {
      this.dispose(time, indexValue.index)
    } else {
      this.sink.event(time, indexValue.value)
    }
  }

  dispose(time: Time, index: number): void {
    this.disposables[index][Symbol.dispose]()
    if (--this.activeCount === 0) {
      this.sink.end(time)
    }
  }

  error(time: Time, err: any): void {
    this.sink.error(time, err)
  }

  end(time: Time): void {
    // This should not be called directly as merge manages its own lifecycle
    // through activeCount tracking
    // If we reach here, it means all sources ended without errors
    this.sink.end(time)
  }
}
