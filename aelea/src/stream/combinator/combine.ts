import { MergingSink } from '../sink.js'
import type { Disposable, IStream, Sink } from '../types.js'

export const combine =
  <T extends readonly unknown[], E>(streams: { [K in keyof T]: IStream<T[K], E> }, initial: T): IStream<T, E> =>
  (env, sink) => {
    const state = { active: streams.length }
    const streamCount = streams.length

    // Pre-allocate arrays with known size
    const disposables = new Array<Disposable>(streamCount)
    const values = new Array(streamCount)

    // Copy initial values efficiently
    for (let i = 0; i < streamCount; i++) {
      values[i] = initial[i]
    }

    // Use traditional for loop to avoid allocations
    for (let i = 0; i < streamCount; i++) {
      disposables[i] = streams[i](env, new CombineSink(sink, values as [...T], i, state, disposables))
    }

    return {
      [Symbol.dispose]: () => {
        for (let i = 0; i < disposables.length; i++) {
          disposables[i][Symbol.dispose]()
        }
      }
    }
  }

class CombineSink<T extends readonly unknown[]> extends MergingSink<unknown> {
  constructor(
    public override readonly sink: Sink<T>,
    public values: [...T],
    public readonly index: number,
    public override readonly state: { active: number },
    public override readonly disposables: readonly Disposable[]
  ) {
    super(sink as Sink<unknown>, state, disposables)
  }

  event(value: unknown) {
    this.values[this.index] = value
    this.sink.event(this.values as T)
  }
}
