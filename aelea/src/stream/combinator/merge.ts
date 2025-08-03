import { stream } from '../stream.js'
import type { ISink, IStream } from '../types.js'
import { disposeAll, disposeNone } from '../utils/disposable.js'
import { type IndexedValue, IndexSink } from '../utils/sink.js'

export function merge<T extends readonly unknown[]>(
  ...sourceList: readonly [...{ [K in keyof T]: IStream<T[K]> }]
): IStream<T[number]> {
  return stream((scheduler, sink) => {
    const l = sourceList.length

    if (l === 0) return disposeNone
    if (l === 1) return sourceList[0].run(scheduler, sink)

    const disposables = new Array<Disposable>(l)
    const sinks: ISink<unknown>[] = new Array(l)

    const mergeSink = new MergeSink(sink, disposables, l)

    for (let indexSink: IndexSink<any>, i = 0; i < l; ++i) {
      indexSink = sinks[i] = new IndexSink(mergeSink, i)
      disposables[i] = sourceList[i].run(scheduler, indexSink)
    }

    return disposeAll(disposables)
  })
}

class MergeSink<A> implements ISink<IndexedValue<A | undefined>> {
  constructor(
    readonly sink: ISink<A | undefined>,
    public disposables: Disposable[],
    public activeCount: number
  ) {}

  event(indexValue: IndexedValue<A | undefined>): void {
    if (indexValue.active) {
      this.sink.event(indexValue.value)
    } else {
      this.dispose(indexValue.index)
    }
  }

  private dispose(index: number): void {
    this.disposables[index][Symbol.dispose]()
    if (--this.activeCount === 0) {
      this.sink.end()
    }
  }

  error(err: any): void {
    this.sink.error(err)
  }

  end(): void {
    // This should not be called directly as merge manages its own lifecycle
    // through activeCount tracking
    // If we reach here, it means all sources ended without errors
    this.sink.end()
  }
}
