import type { IStream, Sink } from '../types.js'

/**
 * Debounce stream events, only emitting after a period of inactivity
 */
export const debounce =
  <T>(delay: number) =>
  (source: IStream<T>): IStream<T> => ({
    run(scheduler, sink) {
      let handle: any = null
      let latestValue: T
      let hasValue = false

      const clearTimer = () => {
        if (handle !== null) {
          clearTimeout(handle)
          handle = null
        }
      }

      const debounceSink: Sink<T> = {
        event: (value) => {
          latestValue = value
          hasValue = true

          clearTimer()

          handle = scheduler.schedule(() => {
            if (hasValue) {
              sink.event(latestValue)
              hasValue = false
            }
          }, delay)
        },
        error: (e) => {
          clearTimer()
          sink.error(e)
        },
        end: () => {
          // Emit any pending value before ending
          if (hasValue && handle !== null) {
            clearTimer()
            sink.event(latestValue)
          }
          sink.end()
        }
      }

      const disposable = source.run(scheduler, debounceSink)

      return {
        [Symbol.dispose]: () => {
          clearTimer()
          disposable[Symbol.dispose]()
        }
      }
    }
  })
