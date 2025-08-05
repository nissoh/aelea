import { stream } from '../stream.js'
import type { IStream } from '../types.js'
import { disposeWith } from '../utils/disposable.js'

export const fromPromise = <T>(promise: Promise<T>): IStream<T> =>
  stream((sink, _) => {
    let cancelled = false

    promise.then(
      value => {
        if (!cancelled) {
          sink.event(value)
          sink.end()
        }
      },
      error => {
        if (!cancelled) {
          sink.error(error)
        }
      }
    )

    return disposeWith(() => {
      cancelled = true
    })
  })
