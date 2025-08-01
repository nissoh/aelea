import type { IStream, Sink } from '../types.js'

export const fromArray = <A>(arr: readonly A[]): IStream<A> => ({
  run(scheduler, sink: Sink<A>): Disposable {
    function emitArray() {
      try {
        for (const a of arr) {
          sink.event(a)
        }
        sink.end()
      } catch (error) {
        sink.error(error)
      }
    }

    return scheduler.immediate(emitArray)
  }
})
