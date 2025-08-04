import type { IStream } from '../types.js'
import { curry3 } from '../utils/function.js'
import { skip } from './skip.js'
import { take } from './take.js'

/**
 * Take a slice of values from start index to end index
 * 
 * stream:      -0-1-2-3-4-5-6-7->
 * slice(2, 5): -----2-3-4-|
 */
export const slice: ISliceCurry = curry3((start, end, source) => {
  const count = Math.max(0, end - start)
  const afterSkip = skip(start, source)
  return take(count, afterSkip)
})

export interface ISliceCurry {
  <T>(start: number, end: number, source: IStream<T>): IStream<T>
  <T>(start: number, end: number): (source: IStream<T>) => IStream<T>
  <T>(start: number): (end: number) => (source: IStream<T>) => IStream<T>
}
