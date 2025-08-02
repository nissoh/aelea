import type { ICreateStream, IStream } from '../stream/index.js'
import type { I$Scheduler } from './types.js'

export const stream = <T, S extends I$Scheduler>(run: ICreateStream<T, S>): IStream<T, S> => new Stream<T, S>(run)

class Stream<T, S extends I$Scheduler> implements IStream<T, S> {
  constructor(public readonly run: ICreateStream<T, S>) {}
}
