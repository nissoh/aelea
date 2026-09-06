import { just } from '../source/just.js'
import type { IOps, ISink, IStream } from '../types.js'

export function toStream<T>(maybeStream: T | IStream<T>): IStream<T> {
  return isStream(maybeStream) ? maybeStream : just(maybeStream)
}

export function isStream(s: unknown): s is IStream<unknown> {
  return typeof s === 'object' && s !== null && 'run' in s && typeof (s as any).run === 'function'
}

export function isFunction(s: unknown): s is IOps<unknown, unknown> {
  return s instanceof Function
}

export const nullSink: ISink<any> = {
  event: () => {},
  error: () => {},
  end: () => {}
}
