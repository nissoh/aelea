import type { IStream } from '../types.js'
import { curry3 } from '../utils/function.js'
import { skip } from './skip.js'
import { take } from './take.js'

/**
 * Take a slice of events (values or errors) from start index to end index
 *
 * stream:      -a-b-c-d-e-f->
 * slice(2, 5): -----c-d-e|
 *
 * stream:      -a-X-c-d-e->  (X = error)
 * slice(2, 5): -----c-d-e|
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
