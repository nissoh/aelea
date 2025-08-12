import type { IScheduler, ISink, IStream } from '../types.js'
import { disposeWith } from '../utils/disposable.js'

/**
 * Stream that emits the resolved value of a promise
 */
class FromPromise<T> implements IStream<T> {
  constructor(private readonly promise: Promise<T>) {}

  run(sink: ISink<T>, _scheduler: IScheduler): Disposable {
    let disposed = false

    this.promise.then(
      value => {
        if (disposed) return

        sink.event(value)
        sink.end()
      },
      error => {
        if (disposed) return

        sink.error(error)
        sink.end()
      }
    )

    return disposeWith(() => {
      disposed = true
    })
  }
}

export const fromPromise = <T>(promise: Promise<T>): IStream<T> => new FromPromise(promise)
