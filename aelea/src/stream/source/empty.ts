import type { IStream } from '../types.js'

export const empty: IStream<never> = {
  run(scheduler, sink) {
    return scheduler.immediate(() => sink.end())
  }
}
