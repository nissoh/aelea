import type { IStream, RunStream } from './types.js'

export const stream = <A>(run: RunStream<A>): IStream<A> => new Stream(run)

class Stream<A> {
  constructor(public readonly run: RunStream<A>) {}
}
