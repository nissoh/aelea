import type { IStream } from '../types.js'

export const empty: IStream<never> = {
  run(scheduler, sink) {
    return scheduler.setImmediate((sink: any) => sink.end(), sink)
  }
}
