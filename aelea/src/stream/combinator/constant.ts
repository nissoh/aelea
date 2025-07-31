import { curry2 } from '../function.js'
import { now } from '../source/now.js'
import type { IStream } from '../types.js'
import { map } from './map.js'
import { merge } from './merge.js'

export interface IStartWithCurry {
  <T>(value: T, stream: IStream<T>): IStream<T>
  <T>(value: T): (stream: IStream<T>) => IStream<T>
}

export const startWith: IStartWithCurry = curry2((value, stream) => merge(now(value), stream))

export interface IConstantCurry {
  <T>(value: T, stream: IStream<any>): IStream<T>
  <T>(value: T): (stream: IStream<any>) => IStream<T>
}

export const constant: IConstantCurry = curry2((value, stream) => map(() => value, stream))
