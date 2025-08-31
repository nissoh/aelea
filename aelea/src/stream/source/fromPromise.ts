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
        sink.event(time, value)
        sink.end(time)
      },
      error => {
        if (disposed) return
        const time = scheduler.time()
        sink.error(time, error)
        sink.end(time)
      }
    )

    return disposeWith(() => {
      disposed = true
    })
  }
}

export const fromPromise = <T>(promise: Promise<T>): IStream<T> => new FromPromise(promise)
