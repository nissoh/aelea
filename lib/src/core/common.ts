import { startWith, never, empty, run } from "@most/core"
import { disposeNone } from "@most/disposable"
import { compose } from "@most/prelude"
import type { Stream, Sink, Time, Scheduler, Disposable } from "@most/types"
import type { Op } from "./types"



type Fn<T, R> = (a: T) => R

export const xForver = <T>(x: T) => startWith(x, never())

export function MaybeOp<A, B, C>(a: Op<A, B>, b?: Op<B, C>) {
  return b ? compose(b, a) : a
}

export function isStream(s: unknown): s is Stream<unknown> {
  return s instanceof Object && 'run' in s
}

export function isFunction(s: unknown): s is Op<unknown, unknown> {
  return s instanceof Function
}

const EMPTY = empty()
export function isEmpty(s: Stream<unknown>): boolean {
  return s === EMPTY
}

export abstract class Pipe<A, B = A> implements Sink<A> {

  constructor(protected readonly sink: Sink<B>) { }

  abstract event(t: Time, x: A): void

  end(t: Time): void {
    return this.sink.end(t)
  }

  error(t: Time, e: Error): void {
    return this.sink.error(t, e)
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

export function tryEvent <A>(t: Time, x: A, sink: Sink<A>): void {
  try {
    sink.event(t, x)
  } catch (e: any) {
    sink.error(t, e)
  }
}


export const nullSink = <Sink<never>>{
  // tslint:disable-next-line:no-empty
  event() { },
  // tslint:disable-next-line:no-empty
  end() { },
  // tslint:disable-next-line:no-empty
  error(_, x) {
    // tslint:disable-next-line: no-console
    console.error(x)
  }
}

export const nullDisposable = <Disposable>{
  // tslint:disable-next-line:no-empty
  dispose() { }
}

// /* tslint:disable:max-line-length */
export function O<T>(): Fn<T, T>
export function O<T, A>(fn1: Fn<T, A>): Fn<T, A>
export function O<T, A, B>(fn1: Fn<T, A>, fn2: Fn<A, B>): Fn<T, B>
export function O<T, A, B, C>(fn1: Fn<T, A>, fn2: Fn<A, B>, fn3: Fn<B, C>): Fn<T, C>
export function O<T, A, B, C, D>(fn1: Fn<T, A>, fn2: Fn<A, B>, fn3: Fn<B, C>, fn4: Fn<C, D>): Fn<T, D>
export function O<T, A, B, C, D, E>(fn1: Fn<T, A>, fn2: Fn<A, B>, fn3: Fn<B, C>, fn4: Fn<C, D>, fn5: Fn<D, E>): Fn<T, E>
export function O<T, A, B, C, D, E, F>(fn1: Fn<T, A>, fn2: Fn<A, B>, fn3: Fn<B, C>, fn4: Fn<C, D>, fn5: Fn<D, E>, fn6: Fn<E, F>): Fn<T, F>
export function O<T, A, B, C, D, E, F, G>(fn1: Fn<T, A>, fn2: Fn<A, B>, fn3: Fn<B, C>, fn4: Fn<C, D>, fn5: Fn<D, E>, fn6: Fn<E, F>, fn7: Fn<F, G>): Fn<T, G>
export function O<T, A, B, C, D, E, F, G, H>(fn1: Fn<T, A>, fn2: Fn<A, B>, fn3: Fn<B, C>, fn4: Fn<C, D>, fn5: Fn<D, E>, fn6: Fn<E, F>, fn7: Fn<F, G>, fn8: Fn<G, H>): Fn<T, H>
export function O<T, A, B, C, D, E, F, G, H, I>(fn1: Fn<T, A>, fn2: Fn<A, B>, fn3: Fn<B, C>, fn4: Fn<C, D>, fn5: Fn<D, E>, fn6: Fn<E, F>, fn7: Fn<F, G>, fn8: Fn<G, H>, ...fn9: Fn<unknown, I>[]): Fn<T, I>
// /* tslint:enable:max-line-length */

export function O<R extends Function[]>(...fns: R) {
  // @ts-ignore
  return fns.length ? fns.reduceRight(compose) : id
}

export function groupByMap<A, B extends A[keyof A]>(list: A[], keyGetter: (v: A) => B) {
  const map = new Map<B, A>()
  list.forEach((item) => {
    const key = keyGetter(item)
    map.set(key, item)
  })
  return map
}

