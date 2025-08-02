import type { IScheduler, ISink, IStream } from './types.js'

export const runStream =
  <T>(scheduler: IScheduler, sink: ISink<T>) =>
  (stream: IStream<T>) => {
    let disposable: Disposable | null = null

    const wrappedSink: ISink<T> = {
      event: (e) => sink.event(e),
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
  (scheduler: IScheduler, signal?: AbortSignal) =>
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
