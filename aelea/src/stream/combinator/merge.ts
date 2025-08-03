import { stream } from '../stream.js'
import type { ISink, IStream } from '../types.js'
import { disposeAll } from '../utils/disposable.js'
import { MergingSink } from '../utils/sink.js'

export function merge<T extends readonly unknown[]>(
  ...sourceList: [...{ [K in keyof T]: IStream<T[K]> }]
): IStream<T[number]> {
  return stream((scheduler, sink) => {
    const state = { active: sourceList.length }
    // Pre-allocate array with known size to avoid growth
    const disposables = new Array<Disposable>(sourceList.length)

    // Use traditional for loop to avoid map/spread allocations
    for (let i = 0; i < sourceList.length; i++) {
      disposables[i] = sourceList[i].run(scheduler, new MergeSink(sink, state, disposables))
    }

    return disposeAll(disposables)
  })
}

export const mergeArray = <T>(streamList: IStream<T>[]): IStream<T> => {
  if (streamList.length === 0) {
    throw new Error('mergeArray requires at least one stream')
  }
  if (streamList.length === 1) {
    return streamList[0]
  }
  return merge(...streamList)
}

class MergeSink<T> extends MergingSink<T> {
  constructor(
    public override readonly sink: ISink<T>,
    public override readonly state: { active: number },
    public override readonly disposables: readonly Disposable[]
  ) {
    super(sink, state, disposables)
  }

  event(value: T) {
    this.sink.event(value)
  }
}
