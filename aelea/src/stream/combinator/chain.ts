import type { IStream } from '../types.js'
import { mergeMapConcurrently } from './join.js'

/**
 * Map each value in the stream to a new stream, and merge it into the
 * returned outer stream. Event arrival times are preserved.
 * @param f chaining function, must return a Stream
 * @param stream
 * @returns new stream containing all events from each stream returned by f
 */
export const chain =
  <A, B>(f: (a: A) => IStream<B>) =>
  (source: IStream<A>): IStream<B> =>
    mergeMapConcurrently(f, Number.POSITIVE_INFINITY, source)
