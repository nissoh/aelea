import { now, nowWith } from '../source/stream.js'
import type { IStream, Time } from '../types.js'
import { curry2 } from '../utils/function.js'
import { map } from './map.js'
import { merge } from './merge.js'

export interface IStartCurry {
  <A, B>(value: A, stream: IStream<B>): IStream<A | B>
  <A, B>(value: A): (stream: IStream<B>) => IStream<A | B>
}

/**
 * Prepend a value to the beginning of a stream
 *
 * stream:   -x-y-z->
 * start(a): a-x-y-z->
 */
export const start: IStartCurry = curry2((value, stream) => merge(now(value), stream))

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
export const constant: IConstantCurry = curry2((value, stream) => map(() => value, stream)) /**
 * Prepend a computed value to the beginning of a stream
 *
 * stream:       -x-y-z->
 * startWith(f): a-x-y-z->

 */
export const startWith: IStartWithCurry = curry2((f, stream) => merge(nowWith(f), stream))

export interface IStartWithCurry {
  <A, B>(f: (time: Time) => A, stream: IStream<B>): IStream<A | B>
  <A, B>(f: (time: Time) => A): (stream: IStream<B>) => IStream<A | B>
}
