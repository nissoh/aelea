import type { Disposable, IStream, Scheduler, Sink } from './types.js'

export const runStream =
  <T>(scheduler: Scheduler, sink: Sink<T>) =>
  (run: IStream<T>) => {
    const disposable = { current: null as Disposable | null }

    const d = run(scheduler, {
      event: (value) => sink.event(value),
      error(error) {
        disposable.current?.[Symbol.dispose]()
        sink.error(error)
      },
      end() {
        disposable.current?.[Symbol.dispose]()
        sink.end()
      }
    })

    disposable.current = d
    return d
  }

export const runPromise =
  (scheduler: Scheduler, signal?: AbortSignal) =>
  <T>(run: IStream<T>) =>
    new Promise<void>((end, error) => {
      const d = run(scheduler, {
        event() {},
        error,
        end
      })
      signal?.addEventListener('abort', () => {
        d[Symbol.dispose]()
        error(new Error('Aborted'))
      })
    })
