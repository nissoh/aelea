import type { IStream } from '../types.js'

export const empty: IStream<never> = (scheduler: any, sink) => {
  return scheduler.setImmediate((sink: any) => sink.end(), sink)
}
