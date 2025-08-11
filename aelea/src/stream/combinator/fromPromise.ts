import { stream } from '../stream.js'
import type { IStream } from '../types.js'
import { disposeWith } from '../utils/disposable.js'

export const fromPromise = <T>(promise: Promise<T>): IStream<T> =>
  stream((sink, _) => {
    let disposed = false

    promise.then(
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
  })
