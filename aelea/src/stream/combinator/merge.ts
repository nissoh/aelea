import { empty } from '../source/void.js'
import type { IScheduler, ISink, IStream, ITime } from '../types.js'
import { disposeAll, disposeNone } from '../utils/disposable.js'

/**
 * Stream that merges multiple streams into one, emitting values as they arrive
 */
class Merge<T> implements IStream<T> {
  constructor(readonly sourceList: readonly IStream<T>[]) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    const l = this.sourceList.length
    const disposables = new Array<Disposable>(l)
    const mergeSink = new MergeSink(sink, disposables, l)

    for (let i = 0; i < l; ++i) {
      const innerSink = new MergeInnerSink(sink, mergeSink, i)
      const d = this.sourceList[i].run(innerSink, scheduler)
      // A source that ended synchronously inside run() reached endOne before
      // its disposable slot was assigned — dispose the handle here instead.
      if (innerSink.ended) {
        d[Symbol.dispose]()
        disposables[i] = disposeNone
      } else {
        disposables[i] = d
      }
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

/**
 * Coordinates end/disposal across the merged sources. Values bypass this and
 * flow straight from each MergeInnerSink to the downstream sink — merge needs
 * no per-value index or latest-value bookkeeping (unlike combine/zip), so the
 * IndexSink indirection is avoided on the hot path.
 */
class MergeSink<A> {
  constructor(
    readonly sink: ISink<A>,
    readonly disposables: Disposable[],
    public activeCount: number
  ) {}

  endOne(time: ITime, index: number): void {
    const d = this.disposables[index]
    if (d !== undefined) {
      d[Symbol.dispose]()
      this.disposables[index] = disposeNone
    }
    if (--this.activeCount === 0) {
      this.sink.end(time)
    }
  }
}

class MergeInnerSink<A> implements ISink<A> {
  ended = false

  constructor(
    readonly sink: ISink<A>,
    readonly merge: MergeSink<A>,
    readonly index: number
  ) {}

  event(time: ITime, value: A): void {
    this.sink.event(time, value)
  }

  error(time: ITime, err: unknown): void {
    this.sink.error(time, err)
  }

  end(time: ITime): void {
    this.ended = true
    this.merge.endOne(time, this.index)
  }
}
