import type { IStream, Scheduler, Sink } from './types.js'

export const stream = <A>(run: <S extends Scheduler>(scheduler: S, sink: Sink<A>) => Disposable): IStream<A> =>
  new Stream(run)

class Stream<A> {
  constructor(public readonly run: <S extends Scheduler>(scheduler: S, sink: Sink<A>) => Disposable) {}
}
