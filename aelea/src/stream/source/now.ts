import type { IStream } from '../types.js'

export const now = <A>(a: A): IStream<A> => ({
  run(scheduler, sink) {
    return scheduler.immediate(() => {
      sink.event(a)
      sink.end()
    })
  }
})
