import type { IStream } from '../types.js'
import { curry2 } from '../utils/function.js'
import { mergeMapConcurrently } from './join.js'

export const chain: IChainCurry = curry2((f, source) => mergeMapConcurrently(f, Number.POSITIVE_INFINITY, source))

export interface IChainCurry {
  <A, B>(f: (a: A) => IStream<B>, source: IStream<A>): IStream<B>
  <A, B>(f: (a: A) => IStream<B>): (source: IStream<A>) => IStream<B>
}
