import type { IScheduler, ISink, IStream } from '../types.js'
import { disposeWith } from '../utils/disposable.js'
import { tryEvent } from '../utils/sink.js'

/**
 * Stream that emits the resolved value of a promise, then ends.
 * A rejection is a stream failure: error then end.
 */
class FromPromise<T> implements IStream<T> {
  constructor(readonly promise: Promise<T>) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    let disposed = false

    this.promise.then(
      value => {
        if (disposed) return
        const time = scheduler.time()
        try {
          tryEvent(sink, time, value)
        } finally {
          sink.end(time)
        }
      },
      error => {
        if (disposed) return
        const time = scheduler.time()
        try {
          sink.error(time, error)
        } finally {
          sink.end(time)
        }
      }
    )

    return disposeWith(() => {
      disposed = true
    })
  }
}

export const fromPromise = <T>(promise: Promise<T>): IStream<T> => new FromPromise(promise)
