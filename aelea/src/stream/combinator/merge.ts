import type { IStream, Sink } from '../types.js'
import { disposeAll } from '../utils/disposable.js'
import { MergingSink } from '../utils/sink.js'

export function merge<T extends readonly unknown[]>(
  ...streams: [...{ [K in keyof T]: IStream<T[K]> }]
): IStream<T[number]> {
  return {
    run(scheduler, sink) {
      const state = { active: streams.length }
      // Pre-allocate array with known size to avoid growth
      const disposables = new Array<Disposable>(streams.length)

      // Use traditional for loop to avoid map/spread allocations
      for (let i = 0; i < streams.length; i++) {
        disposables[i] = streams[i].run(scheduler, new MergeSink(sink, state, disposables))
      }

      return disposeAll(disposables)
    }
  }
}

export const mergeArray = <T>(streams: IStream<T>[]): IStream<T> => {
  if (streams.length === 0) {
    throw new Error('mergeArray requires at least one stream')
  }
  if (streams.length === 1) {
    return streams[0]
  }
  return merge(...streams)
}

class MergeSink<T> extends MergingSink<T> {
  constructor(
    public override readonly sink: Sink<T>,
    public override readonly state: { active: number },
    public override readonly disposables: readonly Disposable[]
  ) {
    super(sink, state, disposables)
  }

  event(value: T) {
    this.sink.event(value)
  }
}
