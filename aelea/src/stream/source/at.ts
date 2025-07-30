import type { IStream } from '../types.js'

export const at =
  <T, S>(delay: number, value: T): IStream<T, S> =>
  (scheduler: any, sink) => {
    return scheduler.setTimeout(
      (sink: any) => {
        sink.event(value)
        sink.end()
      },
      delay,
      sink
    )
  }
