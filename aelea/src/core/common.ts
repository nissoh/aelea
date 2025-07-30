import { empty, never, now, run, startWith } from '@most/core'
import { disposeNone } from '@most/disposable'
import type { Scheduler, Sink, Stream, Time } from '@most/types'

export type Fn<T, R> = (a: T) => R

export type IOps<I, O = I> = Fn<Stream<I>, Stream<O>>

export const xForver = <T>(x: T) => startWith(x, never())

export function maybeOps<A, B>(a?: IOps<A, B>) {
  return a ? a : O()
}

export function toStream<T>(maybeStream: T | Stream<T>): Stream<T> {
  return isStream(maybeStream) ? maybeStream : now(maybeStream)
}

export function isStream(s: unknown): s is Stream<unknown> {
  return s instanceof Object && 'run' in s
}

export function isFunction(s: unknown): s is IOps<unknown, unknown> {
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
export const O: IOp = function O(...fns: Fn<any, any>[]) {
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

export interface IOp {
  (): <I>(x: I) => I
  <I, O>(fn1: Fn<I, O>): Fn<I, O>
  <I, O, A>(fn1: Fn<I, A>, fn2: Fn<A, O>): Fn<I, O>
  <I, O, A, B>(fn1: Fn<I, A>, fn2: Fn<A, B>, fn3: Fn<B, O>): Fn<I, O>
  <I, O, A, B, C>(fn1: Fn<I, A>, fn2: Fn<A, B>, fn3: Fn<B, C>, fn4: Fn<C, O>): Fn<I, O>
  <I, O, A, B, C, D>(fn1: Fn<I, A>, fn2: Fn<A, B>, fn3: Fn<B, C>, fn4: Fn<C, D>, fn5: Fn<D, O>): Fn<I, O>
  <I, O, A, B, C, D, E>(
    fn1: Fn<I, A>,
    fn2: Fn<A, B>,
    fn3: Fn<B, C>,
    fn4: Fn<C, D>,
    fn5: Fn<D, E>,
    fn6: Fn<E, O>
  ): Fn<I, O>
  <I, O, A, B, C, D, E, F>(
    fn1: Fn<I, A>,
    fn2: Fn<A, B>,
    fn3: Fn<B, C>,
    fn4: Fn<C, D>,
    fn5: Fn<D, E>,
    fn6: Fn<E, F>,
    fn7: Fn<F, O>
  ): Fn<I, O>
  <I, O, A, B, C, D, E, F, G>(
    fn1: Fn<I, A>,
    fn2: Fn<A, B>,
    fn3: Fn<B, C>,
    fn4: Fn<C, D>,
    fn5: Fn<D, E>,
    fn6: Fn<E, F>,
    fn7: Fn<F, G>,
    fn8: Fn<G, O>
  ): Fn<I, O>

  <T, R>(...fn9: Fn<T, R>[]): Fn<T, R>
}
