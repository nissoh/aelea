import type { IStream } from '../types.js'

export const at = <T>(delay: number, value: T): IStream<T> => ({
  run(scheduler, sink) {
    return scheduler.schedule(() => {
      sink.event(value)
      sink.end()
    }, delay)
  }
})
