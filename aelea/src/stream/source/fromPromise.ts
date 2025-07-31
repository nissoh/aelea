import type { IStream } from '../types.js'

/**
 * Creates a stream from a Promise.
 * The stream will emit the resolved value and then end.
 * If the promise rejects, the stream will error.
 * @param promise - The promise to convert to a stream
 * @returns A stream that emits the promise result
 */
export const fromPromise = <T>(promise: Promise<T>): IStream<T> => ({
  run(_, sink) {
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

    return {
      [Symbol.dispose]() {
        cancelled = true
      }
    }
  }
})
