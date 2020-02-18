
import {Sink, Disposable, Time} from '@most/types'
import {compose as composeFn, compose} from '@most/prelude'
import {Op} from './types'


type Fn<T, R> = (a: T) => R


export function MaybeOp<A, B, C>(a: Op<A, B>, b?: Op<B, C>) {
  return b ? compose(b, a) : a
}

export abstract class Pipe<A, B> implements Sink<A> {

  constructor(protected readonly sink: Sink<B>) {}

  abstract event (t: Time, x: A): void

  end(t: Time): void {
    return this.sink.end(t)
  }

  error(t: Time, e: Error): void {
    return this.sink.error(t, e)
  }
}

export const nullSink = <Sink<any>>{
  // tslint:disable-next-line:no-empty
  event(t, x) {},
  // tslint:disable-next-line:no-empty
  end(t) {},
  // tslint:disable-next-line:no-empty
  error(t, x) {}
}

export const nullDisposable = <Disposable>{
  // tslint:disable-next-line:no-empty
  dispose() {}
}
const pipeFn = <T, A, B>(f: Fn<T, A>, g: Fn<A, B>) => (x: T): B => g(f(x))

/* tslint:disable:max-line-length */
export function pipe<T, A>(fn1: Fn<T, A>): Fn<T, A>
export function pipe<T, A, B>(fn1: Fn<T, A>, fn2: Fn<A, B>): Fn<T, B>
export function pipe<T, A, B, C>(fn1: Fn<T, A>, fn2: Fn<A, B>, fn3: Fn<B, C>): Fn<T, C>
export function pipe<T, A, B, C, D>(fn1: Fn<T, A>, fn2: Fn<A, B>, fn3: Fn<B, C>, fn4: Fn<C, D>): Fn<T, D>
export function pipe<T, A, B, C, D, E>(fn1: Fn<T, A>, fn2: Fn<A, B>, fn3: Fn<B, C>, fn4: Fn<C, D>, fn5: Fn<D, E>): Fn<T, E>
export function pipe<T, A, B, C, D, E, F>(fn1: Fn<T, A>, fn2: Fn<A, B>, fn3: Fn<B, C>, fn4: Fn<C, D>, fn5: Fn<D, E>, fn6: Fn<E, F>): Fn<T, F>
export function pipe<T, A, B, C, D, E, F, G>(fn1: Fn<T, A>, fn2: Fn<A, B>, fn3: Fn<B, C>, fn4: Fn<C, D>, fn5: Fn<D, E>, fn6: Fn<E, F>, fn7: Fn<F, G>): Fn<T, G>
export function pipe<T, A, B, C, D, E, F, G, H>(fn1: Fn<T, A>, fn2: Fn<A, B>, fn3: Fn<B, C>, fn4: Fn<C, D>, fn5: Fn<D, E>, fn6: Fn<E, F>, fn7: Fn<F, G>, fn8: Fn<G, H>): Fn<T, H>
export function pipe<T, A, B, C, D, E, F, G, H, I>(fn1: Fn<T, A>, fn2: Fn<A, B>, fn3: Fn<B, C>, fn4: Fn<C, D>, fn5: Fn<D, E>, fn6: Fn<E, F>, fn7: Fn<F, G>, fn8: Fn<G, H>, fn9: Fn<H, I>): Fn<T, I>
/* tslint:enable:max-line-length */
export function pipe<T, R>(...fns: Fn<T, R>[]): any {
  return fns.reduce(pipeFn as any)
}


// export function compose<A, B, C>(bc: Func<B, C>, ab: Func<A, B>): Func<A, C>
// export function compose<A, B, C, D>(cd: Func<C, D>, bc: Func<B, C>, ab: Func<A, B>): Func<A, D>
// export function compose<A, B, C, D, E>(de: Func<D, E>, cd: Func<C, D>, bc: Func<B, C>, ab: Func<A, B>): Func<A, E>
// export function compose<A, B, C, D, E, F>(fe: Func<F, E>, de: Func<D, E>, cd: Func<C, D>, bc: Func<B, C>, ab: Func<A, B>): Func<A, F>

// export function compose <T, R>(...fns: Func<T, R>[]): any {
//   return fns.reduceRight(composeFn as any)
// }


