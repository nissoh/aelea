import type { IStream } from '../types.js'

export const periodic =
  <T>(period: number, value: T): IStream<T> =>
  (scheduler: any, sink) => {
    return scheduler.setInterval((sink: any) => sink.event(value), period, sink)
  }
