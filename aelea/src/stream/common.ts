import { startWith } from './combinator/compat.js'
import { op } from './function.js'
import { empty } from './source/empty.js'
import { never } from './source/never.js'
import { now } from './source/now.js'
import type { Fn, IOps, IStream, Scheduler, Sink } from './types.js'

export type { Fn }

export const xForver = <T>(x: T): IStream<T> => startWith(x, never) as IStream<T>

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

export function tryRunning<T>(stream: IStream<T>, sink: Sink<T>, scheduler: Scheduler) {
  try {
    return stream.run(scheduler, sink)
  } catch (e: any) {
    sink.error(e)
    return { [Symbol.dispose]: () => {} }
  }
}

export const disposeNone = { [Symbol.dispose]: () => {} }

export const disposeAll = (disposables: readonly { [Symbol.dispose]: () => void }[]) => {
  for (let i = 0; i < disposables.length; i++) {
    disposables[i][Symbol.dispose]()
  }
}

export const disposeBoth = <T extends { [Symbol.dispose]: () => void }>(
  a: T,
  b: T
): { [Symbol.dispose]: () => void } => {
  return {
    [Symbol.dispose]: () => {
      a[Symbol.dispose]()
      b[Symbol.dispose]()
    }
  }
}

export const nullSink: Sink<any> = {
  event: () => {},
  error: () => {},
  end: () => {}
}
