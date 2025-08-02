import { stream } from '../stream.js'
import type { IStream } from '../types.js'
import { disposeWith } from '../utils/disposable.js'

export const fromPromise = <T>(promise: Promise<T>): IStream<T> =>
  stream((scheduler, sink) => {
    let cancelled = false

    function handleResolve(value: T): void {
      if (!cancelled) {
        sink.event(value)
        sink.end()
      }
    }

    function handleReject(error: any): void {
      if (!cancelled) {
        sink.error(error)
      }
    }

    promise.then(handleResolve, handleReject)

    return disposeWith(() => (cancelled = true))
  })
