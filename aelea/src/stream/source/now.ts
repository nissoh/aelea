import type { IStream } from '../types.js'

export const now =
  <A>(a: A): IStream<A> =>
  (scheduler: any, sink) => {
    return scheduler.setImmediate((sink: any) => {
      sink.event(a)
      sink.end()
    }, sink)
  }
