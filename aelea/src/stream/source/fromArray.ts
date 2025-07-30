import type { IStream, Sink } from '../types.js'

export const fromArray = <A>(arr: readonly A[]): IStream<A> => ({
  run(scheduler, sink: Sink<A>): Disposable {
    return scheduler.schedule(() => {
      for (const a of arr) sink.event(a)
      sink.end()
    }, 0)
  }
})
