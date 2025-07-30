import type { IStream } from '../types.js'
import { map } from './map.js'
import { switchLatest } from './switch.js'

/**
 * Map each value to a stream and switch to the latest inner stream.
 * Also known as flatMap, bind, or concatMap in other libraries.
 */
export const chain =
  <A, B>(f: (a: A) => IStream<B>) =>
  (source: IStream<A>): IStream<B> =>
    switchLatest(map(f)(source))
