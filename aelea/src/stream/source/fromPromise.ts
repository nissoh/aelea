import type { IStream } from '../types.js'

/**
 * Creates a stream from a Promise.
 * The stream will emit the resolved value and then end.
 * If the promise rejects, the stream will error.
 * @param promise - The promise to convert to a stream
 * @returns A stream that emits the promise result
 */
export const fromPromise =
  <T>(promise: Promise<T>): IStream<T> =>
  (_, sink) => {
    let cancelled = false

    promise
      .then((value) => {
        if (!cancelled) {
          sink.event(value)
          sink.end()
        }
      })
      .catch((error) => {
        if (!cancelled) {
          sink.error(error)
        }
      })

    return {
      [Symbol.dispose]: () => {
        cancelled = true
      }
    }
  }
