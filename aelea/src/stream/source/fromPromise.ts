import type { IScheduler, ISink, IStream } from '../types.js'
import { disposeWith } from '../utils/disposable.js'

/**
 * Stream that emits the resolved value of a promise
 */
class FromPromise<T> implements IStream<T> {
  constructor(readonly promise: Promise<T>) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    let disposed = false

    this.promise.then(
      value => {
        if (disposed) return
        const time = scheduler.time()
        // A downstream throw would otherwise vanish as an unhandled rejection;
        // end is delivered in finally even if the error handler throws too.
        try {
          sink.event(time, value)
        } catch (error) {
          sink.error(time, error)
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
