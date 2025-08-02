import type { ICreateStream, IScheduler, IStream } from './types.js'

export const stream = <A>(run: ICreateStream<A, IScheduler>): IStream<A> => new Stream(run)

class Stream<A> {
  constructor(public readonly run: ICreateStream<A, IScheduler>) {}
}
