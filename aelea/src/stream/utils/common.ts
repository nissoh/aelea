import { empty, now } from '../source/stream.js'
import type { IOps, IStream, Sink } from '../types.js'
import { op } from './function.js'

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
