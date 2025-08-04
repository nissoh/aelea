import { now } from '../source/stream.js'
import type { IStream } from '../types.js'
import { curry2 } from '../utils/function.js'
import { map } from './map.js'
import { merge } from './merge.js'

export interface IStartWithCurry {
  <T>(value: T, stream: IStream<T>): IStream<T>
  <T>(value: T): (stream: IStream<T>) => IStream<T>
}

/**
 * Prepend a value to the beginning of a stream
 *
 * stream:       ---1-2-3->
 * startWith(0): -0-1-2-3->
 */
export const startWith: IStartWithCurry = curry2((value, stream) => merge(now(value), stream))

export interface IConstantCurry {
  <T>(value: T, stream: IStream<any>): IStream<T>
  <T>(value: T): (stream: IStream<any>) => IStream<T>
}

/**
 * Replace all values in a stream with a constant
 *
 * stream:      -a-b-c-d->
 * constant(x): -x-x-x-x->
 */
export const constant: IConstantCurry = curry2((value, stream) => map(() => value, stream))
