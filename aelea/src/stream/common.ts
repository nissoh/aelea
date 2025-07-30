/**
 * Common utilities using @aelea/stream instead of @most/core
 * This is a gradual migration approach
 */

import { startWith } from './combinator/compat.js'
import { op } from './function.js'
import { empty } from './source/empty.js'
import { never } from './source/never.js'
import { now } from './source/now.js'
import type { Fn, IStream, Scheduler, Sink } from './types.js'

export type { Fn }

export type IOps<I, O = I, S = Scheduler> = Fn<IStream<I, S>, IStream<O, S>>

export const xForver = <T, S = Scheduler>(x: T): IStream<T, S> =>
  startWith(x, never as IStream<never, S>) as IStream<T, S>

export function maybeOps<A, B, S = Scheduler>(a?: IOps<A, B, S>) {
  return a ? a : op
}

export function toStream<T, S = Scheduler>(maybeStream: T | IStream<T, S>): IStream<T, S> {
  return isStream(maybeStream) ? maybeStream : (now(maybeStream) as IStream<T, S>)
}

export function isStream(s: unknown): s is IStream<unknown, any> {
  return s instanceof Function && s.length === 2
}

export function isFunction(s: unknown): s is IOps<unknown, unknown, any> {
  return s instanceof Function
}

export function isEmpty<S>(s: IStream<unknown, S>): boolean {
  return s === empty
}

export function tryRunning<T, S = Scheduler>(stream: IStream<T, S>, sink: Sink<T>, scheduler: S) {
  try {
    return stream(scheduler, sink)
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
