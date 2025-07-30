import type { IStream, Scheduler, Sink } from '../types.js'

export const fromArray =
  <A>(arr: readonly A[]): IStream<A, Scheduler> =>
  (scheduler: Scheduler, sink: Sink<A>): Disposable => {
    const newLocal = scheduler.setImmediate((sink: any) => {
      for (const a of arr) sink.event(a)
      sink.end()
    }, sink)
    return newLocal
  }
