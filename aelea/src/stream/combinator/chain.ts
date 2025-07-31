import { curry2 } from '../function.js'
import type { IStream } from '../types.js'
import { mergeMapConcurrently } from './join.js'

export interface IChainCurry {
  <A, B>(f: (a: A) => IStream<B>, source: IStream<A>): IStream<B>
  <A, B>(f: (a: A) => IStream<B>): (source: IStream<A>) => IStream<B>
}

/**
 * Map each value in the stream to a new stream, and merge it into the
 * returned outer stream. Event arrival times are preserved.
 * @param f chaining function, must return a Stream
 * @param stream
 * @returns new stream containing all events from each stream returned by f
 */
export const chain: IChainCurry = curry2((f, source) =>
  mergeMapConcurrently(f, Number.POSITIVE_INFINITY, source)
)
