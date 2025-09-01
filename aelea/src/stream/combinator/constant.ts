import { just } from '../source/just.js'
import type { IStream } from '../types.js'
import { curry2 } from '../utils/function.js'
import { map } from './map.js'
import { merge } from './merge.js'

/**
 * Replace all values in a stream with a constant
 *
 * stream:      -a-b-c-d->
 * constant(x): -x-x-x-x->
 */
export const constant: IConstantCurry = curry2((value, stream) => map(() => value, stream))

/**
 * Prepend a value to the beginning of a stream
 *
 * stream:   -x-y-z->
 * start(a): a-x-y-z->
 */
export const start: IStartCurry = curry2((value, stream) => merge(just(value), stream))

export interface IStartCurry {
  <A, B>(value: A, stream: IStream<B>): IStream<A | B>
  <A, B>(value: A): (stream: IStream<B>) => IStream<A | B>
}

export interface IConstantCurry {
  <T>(value: T, stream: IStream<any>): IStream<T>
  <T>(value: T): (stream: IStream<any>) => IStream<T>
}
