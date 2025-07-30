import { now } from '../source/now.js'
import type { IStream } from '../types.js'
import { map } from './map.js'
import { merge } from './merge.js'

export const startWith = <T, S>(value: T, stream: IStream<T, S>): IStream<T, S> =>
  merge(now(value) as IStream<T, S>, stream)

export const constant = <T, In, S>(value: T) => map<In, T, S>(() => value)
