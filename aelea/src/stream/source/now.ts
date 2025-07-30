import type { IStream } from '../types.js'

export const now = <A>(a: A): IStream<A> => ({
  run(scheduler, sink) {
    return scheduler.schedule(() => {
      sink.event(a)
      sink.end()
    }, 0)
  }
})
