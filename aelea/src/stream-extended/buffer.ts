import { disposeWith, type IStream } from '../stream/index.js'

export function flattenEvents<T>(source: IStream<T[]>): IStream<T> {
  return {
    run(sink, scheduler) {
      return source.run(
        {
          event: items => {
            if (!Array.isArray(items)) {
              sink.error(new Error(`flattenEvents: expected array but got ${typeof items}`))
              return
            }

            for (const item of items) {
              sink.event(item)
            }
          },
          error: error => sink.error(error),
          end: () => sink.end()
        },
        scheduler
      )
    }
  }
}

export function bufferEvents<T>(
  source: IStream<T>,
  period = 1000,
  maxSize = Number.POSITIVE_INFINITY
): IStream<readonly T[]> {
  if (period <= 0) {
    throw new Error('Buffer period must be positive')
  }
  if (maxSize <= 0) {
    throw new Error('Max buffer size must be positive')
  }

  return {
    run(sink, scheduler) {
      let buffer: T[] = []
      let nextEmitTime: number | null = null

      const emitBuffer = (time: number) => {
        if (buffer.length > 0) {
          sink.event(buffer)
          buffer = []
        }
        nextEmitTime = time + period
      }

      const onEvent = (event: T) => {
        const time = scheduler.time()
        // Initialize timing on first event
        if (nextEmitTime === null) {
          nextEmitTime = time + period
        }

        buffer.push(event)

        // Emit if period elapsed or buffer full
        if (time >= nextEmitTime || buffer.length >= maxSize) {
          emitBuffer(time)
        }
      }

      const onError = (error: unknown) => sink.error(error)

      const onEnd = () => {
        if (buffer.length > 0) {
          sink.event(buffer)
        }
        sink.end()
      }

      const disposable = source.run({ event: onEvent, error: onError, end: onEnd }, scheduler)

      return disposeWith(() => {
        buffer = []
        disposable[Symbol.dispose]()
      })
    }
  }
}
