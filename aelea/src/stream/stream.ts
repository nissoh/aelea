import type { ICreateStream, IScheduler, IStream } from './types.js'

export const stream = <T, S extends IScheduler>(run: ICreateStream<T>): IStream<T> => new Stream<T>(run)

class Stream<T> implements IStream<T> {
  constructor(public readonly run: ICreateStream<T>) {}
}
