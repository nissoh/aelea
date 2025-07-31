import type { IStream } from 'aelea/stream'
import { switchMap } from 'aelea/stream'

/**
 * Flattens a stream of promises into a stream of values.
 * Similar to @most/core's awaitPromises
 */
export const awaitPromises = <T>(stream: IStream<Promise<T>>): IStream<T> => {
  return switchMap((promise: Promise<T>) => promise, stream)
}

/**
 * Recover from errors by returning an alternate stream.
 * Similar to @most/core's recoverWith
 */
export const recoverWith =
  <T>(f: (error: Error) => IStream<T>) =>
  (stream: IStream<T>): IStream<T> => {
    // This is a simplified implementation that catches errors
    // In a real implementation, you'd need proper error handling in the stream
    return {
      run: (sink, time, scheduler, disposable) => {
        const errorHandlingSink = {
          event: sink.event,
          end: sink.end,
          error: (time: number, error: Error) => {
            // When an error occurs, switch to the recovery stream
            const recoveryStream = f(error)
            recoveryStream.run(sink, time, scheduler, disposable)
          }
        }
        return stream.run(errorHandlingSink, time, scheduler, disposable)
      }
    }
  }
