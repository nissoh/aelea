import { curry3 } from '../function.js'
import type { IStream } from '../types.js'
import { skip } from './skip.js'
import { take } from './take.js'

/**
 * Create a new stream containing only items within a range.
 * @param start - number of items to skip (inclusive start index)
 * @param end - maximum number of items to take (exclusive end index)
 * @param source - the source stream
 * @returns a stream that emits items from start (inclusive) to end (exclusive)
 *
 * @example
 * // Take items 3 through 8
 * slice(3, 8, stream)
 * slice(3, 8)(stream)
 * slice(3)(8)(stream)
 */
export interface ISliceCurry {
  <T>(start: number, end: number, source: IStream<T>): IStream<T>
  (start: number, end: number): <T>(source: IStream<T>) => IStream<T>
  (start: number): (end: number) => <T>(source: IStream<T>) => IStream<T>
}

export const slice: ISliceCurry = curry3((start, end, source) => {
  const count = Math.max(0, end - start)
  // First skip 'start' items, then take 'count' items
  const afterSkip = skip(start)(source)
  return take(count)(afterSkip)
})
