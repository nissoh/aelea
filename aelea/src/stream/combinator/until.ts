import type { Disposable, IStream, Sink } from '../types.js'

/**
 * End a stream when another stream emits a value
 */
export const until =
  <A, B>(endSignal: IStream<B>) =>
  (source: IStream<A>): IStream<A> => ({
    run(scheduler, sink) {
      let ended = false
      let disposables: Disposable[] = []

      const endSink: Sink<B> = {
        event: () => {
          if (!ended) {
            ended = true
            sink.end()
            // Dispose all
            disposables.forEach((d) => d[Symbol.dispose]())
          }
        },
        error: (e) => sink.error(e),
        end: () => {} // Don't end main stream if endSignal ends
      }

      const mainSink: Sink<A> = {
        event: (value) => {
          if (!ended) {
            sink.event(value)
          }
        },
        error: (e) => sink.error(e),
        end: () => {
          if (!ended) {
            ended = true
            sink.end()
            disposables.forEach((d) => d[Symbol.dispose]())
          }
        }
      }

      disposables = [endSignal.run(scheduler, endSink), source.run(scheduler, mainSink)]

      return {
        [Symbol.dispose]: () => {
          ended = true
          disposables.forEach((d) => d[Symbol.dispose]())
        }
      }
    }
  })
