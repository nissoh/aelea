import type { IStream, RunStream } from './types.js'

export const stream = <A>(run: RunStream<A>): IStream<A> => new Stream(run)

class Stream<A> {
  readonly run: RunStream<A>
  constructor(run: RunStream<A>) {
    this.run = run
  }
}
