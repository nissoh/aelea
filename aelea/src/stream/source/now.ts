import type { IStream, Sink } from '../types.js'

export const now = <A>(value: A): IStream<A> => ({
  run(scheduler, sink) {
    return scheduler.asap(sink, eventNow, value)
  }
})

function eventNow<T>(sink: Sink<T>, value: T) {
  sink.event(value)
  sink.end()
}
