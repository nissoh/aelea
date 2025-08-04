import type { IStream } from '../types.js'
import { curry2 } from '../utils/function.js'
import { mergeMapConcurrently } from './join.js'

/**
 * Map each value to a stream and flatten all resulting streams (flatMap)
 *
 * stream:                 -1----2----3->
 * joinMap(x => [x,x+1]):  -1-2--2-3--3-4->
 */
export const joinMap: IJoinMapCurry = curry2((f, source) => mergeMapConcurrently(f, Number.POSITIVE_INFINITY, source))

export interface IJoinMapCurry {
  <A, B>(f: (a: A) => IStream<B>, source: IStream<A>): IStream<B>
  <A, B>(f: (a: A) => IStream<B>): (source: IStream<A>) => IStream<B>
}
