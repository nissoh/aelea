import type { IStream, Sink } from '../types.js'

export const fromArray = <T>(arr: readonly T[]): IStream<T> => ({
  run(scheduler, sink: Sink<T>): Disposable {
    return scheduler.asap(sink, emitArray, arr)
  }
})

function emitArray<T>(sink: Sink<T>, arr: readonly any[]): void {
  for (const a of arr) {
    sink.event(a)
  }
  sink.end()
}
