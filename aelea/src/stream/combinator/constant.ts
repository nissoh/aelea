import { now, nowWith } from '../source/stream.js'
import type { IStream } from '../types.js'
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
 * stream:   -123->
 * start(0): 0123->
 */
export const start: IStartCurry = curry2((value, stream) => startWith(() => value, stream))

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


export const startWith: IStartWithCurry = curry2((f, stream) => merge(nowWith(f), stream))

export interface IStartWithCurry {
  <A, B>(f: (time: number) => A, stream: IStream<B>): IStream<A | B>
  <A, B>(f: (time: number) => A): (stream: IStream<B>) => IStream<A | B>
}
