
import { Sink, Disposable, Time, Stream } from '@most/types'
import { compose, id } from '@most/prelude'
import { Op } from './types'
import { empty } from '@most/core'


type Fn<T, R> = (a: T) => R

const EMPTY = empty()

export function MaybeOp<A, B, C>(a: Op<A, B>, b?: Op<B, C>) {
  return b ? compose(b, a) : a
}

export function isStream<T>(s: any): s is Stream<T> {
  return 'run' in s
}

export function isEmpty(s: Stream<any>): boolean {
  return s === EMPTY
}

export abstract class Pipe<A, B> implements Sink<A> {

  constructor(protected readonly sink: Sink<B>) { }

  abstract event(t: Time, x: A): void

  end(t: Time): void {
    return this.sink.end(t)
  }

  error(t: Time, e: Error): void {
    return this.sink.error(t, e)
  }
}

export class SettableDisposable implements Disposable {
  private disposable?: Disposable;
  private disposed: boolean;

  constructor() {
    this.disposable = undefined
    this.disposed = false
  }

  setDisposable(disposable: Disposable): void {
    if (this.disposable !== undefined) {
      throw new Error('setDisposable called more than once')
    }

    this.disposable = disposable

    if (this.disposed) {
      disposable.dispose()
    }
  }

  dispose(): void {
    if (this.disposed) {
      return
    }

    this.disposed = true

    if (this.disposable !== undefined) {
      this.disposable.dispose()
    }
  }
}


export const nullSink = <Sink<any>>{
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

/* tslint:disable:max-line-length */
export function O<T>(): Fn<T, T>
export function O<T, A>(fn1: Fn<T, A>): Fn<T, A>
export function O<T, A, B>(fn1: Fn<T, A>, fn2: Fn<A, B>): Fn<T, B>
export function O<T, A, B, C>(fn1: Fn<T, A>, fn2: Fn<A, B>, fn3: Fn<B, C>): Fn<T, C>
export function O<T, A, B, C, D>(fn1: Fn<T, A>, fn2: Fn<A, B>, fn3: Fn<B, C>, fn4: Fn<C, D>): Fn<T, D>
export function O<T, A, B, C, D, E>(fn1: Fn<T, A>, fn2: Fn<A, B>, fn3: Fn<B, C>, fn4: Fn<C, D>, fn5: Fn<D, E>): Fn<T, E>
export function O<T, A, B, C, D, E, F>(fn1: Fn<T, A>, fn2: Fn<A, B>, fn3: Fn<B, C>, fn4: Fn<C, D>, fn5: Fn<D, E>, fn6: Fn<E, F>): Fn<T, F>
export function O<T, A, B, C, D, E, F, G>(fn1: Fn<T, A>, fn2: Fn<A, B>, fn3: Fn<B, C>, fn4: Fn<C, D>, fn5: Fn<D, E>, fn6: Fn<E, F>, fn7: Fn<F, G>): Fn<T, G>
export function O<T, A, B, C, D, E, F, G, H>(fn1: Fn<T, A>, fn2: Fn<A, B>, fn3: Fn<B, C>, fn4: Fn<C, D>, fn5: Fn<D, E>, fn6: Fn<E, F>, fn7: Fn<F, G>, fn8: Fn<G, H>): Fn<T, H>
export function O<T, A, B, C, D, E, F, G, H, I>(fn1: Fn<T, A>, fn2: Fn<A, B>, fn3: Fn<B, C>, fn4: Fn<C, D>, fn5: Fn<D, E>, fn6: Fn<E, F>, fn7: Fn<F, G>, fn8: Fn<G, H>, ...fn9: Fn<any, I>[]): Fn<T, I>
/* tslint:enable:max-line-length */

export function O<A, B, C>(...fns: Fn<A, B>[]): Fn<B, C> {
  return fns?.length ? fns.reduceRight(compose as any) as any : id
}





