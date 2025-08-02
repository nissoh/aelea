import type { IStream } from '../types.js'

export const empty: IStream<never> = {
  run(scheduler, sink) {
    return scheduler.asap(sink, emitEmpty)
  }
}

function emitEmpty(sink: any): void {
  sink.end()
}
