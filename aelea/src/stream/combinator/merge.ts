import { MergingSink } from '../sink.js'
import type { Disposable, IStream, Sink } from '../types.js'

export const merge =
  <T, E>(...streams: IStream<T, E>[]): IStream<T, E> =>
  (env, sink) => {
    const state = { active: streams.length }
    // Pre-allocate array with known size to avoid growth
    const disposables = new Array<Disposable>(streams.length)

    // Use traditional for loop to avoid map/spread allocations
    for (let i = 0; i < streams.length; i++) {
      disposables[i] = streams[i](env, new MergeSink(sink, state, disposables))
    }

    return {
      [Symbol.dispose]: () => {
        // Traditional for loop is faster than forEach
        for (let i = 0; i < disposables.length; i++) {
          disposables[i][Symbol.dispose]()
        }
      }
    }
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
