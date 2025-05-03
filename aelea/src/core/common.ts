import { empty, never, run, startWith } from '@most/core'
import { disposeNone } from '@most/disposable'
import { compose } from '@most/prelude'
import type { Disposable, Scheduler, Sink, Stream, Time } from '@most/types'
import type { Fn, Op, Ops } from './types.js'

export const xForver = <T>(x: T) => startWith(x, never())

export function maybeOps<A, B>(a?: Ops<A, B>) {
  return a ? a : O()
}

export function isStream(s: unknown): s is Stream<unknown> {
  return s instanceof Object && 'run' in s
}

export function isFunction(s: unknown): s is Ops<unknown, unknown> {
  return s instanceof Function
}

const EMPTY = empty()
export function isEmpty(s: Stream<unknown>): boolean {
  return s === EMPTY
}

export abstract class Pipe<A, B = A> implements Sink<A> {
  constructor(protected readonly sink: Sink<B>) {}

  abstract event(t: Time, x: A): void

  end(t: Time): void {
    this.sink.end(t)
  }

  error(t: Time, e: Error): void {
    this.sink.error(t, e)
  }
}

export function tryRunning<T>(stream: Stream<T>, sink: Sink<T>, scheduler: Scheduler, time = scheduler.currentTime()) {
  try {
    return run(sink, scheduler, stream)
  } catch (e: any) {
    sink.error(time, e)
    return disposeNone()
  }
}

export function tryEvent<A>(t: Time, x: A, sink: Sink<A>): void {
  try {
    sink.event(t, x)
  } catch (e: any) {
    sink.error(t, e)
  }
}

export const nullSink = <Sink<never>>{
  event() {},
  end() {},
  error(_, x) {
    console.error(x)
  }
}

export const nullDisposable = <Disposable>{
  dispose() {}
}

// compose(g, f) applies f first, then g.
// We use reduce starting with the first function and compose subsequent functions onto the accumulator.
// const applyLeft = (v: any, f: any) => f(v)
export const O: Op = function O(...fns: Fn<any, any>[]) {
  return (x: any) => fns.reduce((v: any, f: any) => f(v), x)
}

export function groupByMap<A, B extends A[keyof A]>(list: A[], keyGetter: (v: A) => B) {
  const map = new Map<B, A>()
  for (const item of list) {
    const key = keyGetter(item)
    map.set(key, item)
  }
  return map
}
