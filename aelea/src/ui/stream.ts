import type { IScheduler, ISink, IStream } from '../stream/index.js'

type ICreateStream<T> = (sink: ISink<T>, scheduler: IScheduler) => Disposable

export const stream = <T>(run: ICreateStream<T>) => new Stream(run)

class Stream<T> implements IStream<T> {
  constructor(public readonly run: ICreateStream<T>) {}
}
