import { op } from './function.js'
import { empty } from './source/empty.js'
import { now } from './source/now.js'
import type { Fn, IOps, IStream, Sink } from './types.js'

export type { Fn }

export function maybeOps<A, B>(a?: IOps<A, B>) {
  return a ? a : op
}

export function toStream<T>(maybeStream: T | IStream<T>): IStream<T> {
  return isStream(maybeStream) ? maybeStream : now(maybeStream)
}

export function isStream(s: unknown): s is IStream<unknown> {
  return typeof s === 'object' && s !== null && 'run' in s && typeof (s as any).run === 'function'
}

export function isFunction(s: unknown): s is IOps<unknown, unknown> {
  return s instanceof Function
}

export function isEmpty(s: IStream<unknown>): boolean {
  return s === empty
}

export const nullSink: Sink<any> = {
  event: () => {},
  error: () => {},
  end: () => {}
}
