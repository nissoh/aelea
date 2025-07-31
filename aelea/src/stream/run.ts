import type { IStream, Scheduler, Sink } from './types.js'

export const runStream =
  <T>(scheduler: Scheduler, sink: Sink<T>) =>
  (stream: IStream<T>) => {
    let disposable: Disposable | null = null

    const wrappedSink: Sink<T> = {
      event: sink.event.bind(sink),
      error(error) {
        disposable?.[Symbol.dispose]()
        sink.error(error)
      },
      end() {
        disposable?.[Symbol.dispose]()
        sink.end()
      }
    }

    disposable = stream.run(scheduler, wrappedSink)
    return disposable
  }

export const runPromise =
  (scheduler: Scheduler, signal?: AbortSignal) =>
  <T>(stream: IStream<T>) =>
    new Promise<void>((resolve, reject) => {
      const disposable = stream.run(scheduler, {
        event() {},
        error: reject,
        end: resolve
      })

      if (signal) {
        const abort = () => {
          disposable[Symbol.dispose]()
          reject(new Error('Aborted'))
        }
        signal.addEventListener('abort', abort, { once: true })
      }
    })
