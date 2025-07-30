import { now } from '../source/now.js'
import type { IStream } from '../types.js'
import { map } from './map.js'
import { merge } from './merge.js'

export const startWith = <T>(value: T, stream: IStream<T>): IStream<T> => merge(now(value), stream)

export const constant = <T, In>(value: T) => map<In, T>(() => value)
