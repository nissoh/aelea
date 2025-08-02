import type { ICreateStream, IScheduler, IStream } from './types.js'

export const stream = <T, S extends IScheduler>(run: ICreateStream<T, S>): IStream<T, S> => new Stream<T, S>(run)

class Stream<T, S extends IScheduler> implements IStream<T, S> {
  constructor(public readonly run: ICreateStream<T, S>) {}
}
