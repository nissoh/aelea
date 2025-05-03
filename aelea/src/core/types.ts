import type { Stream } from '@most/types'

export type Fn<T, R> = (a: T) => R

export type Ops<I, O> = Fn<Stream<I>, Stream<O>>

export interface Tether<I, O> {
  (): Ops<I, I>
  (o1: Ops<I, O>): Ops<I, I>
  <O1>(o1: Ops<I, O1>, o2: Ops<O1, O>): Ops<I, I>
  <O1, O2>(o1: Ops<I, O1>, o2: Ops<O1, O2>, o3: Ops<O2, O>): Ops<I, I>
  <O1, O2, O3>(o1: Ops<I, O1>, o2: Ops<O1, O2>, o3: Ops<O2, O3>, o4: Ops<O3, O>): Ops<I, I>
  <B1, B2, B3, B4>(o1: Ops<I, B1>, o2: Ops<B1, B2>, o3: Ops<B2, B3>, o4: Ops<B3, B4>, o5: Ops<B4, O>): Ops<I, I>
  <B1, B2, B3, B4, B5>(o1: Ops<I, B1>, o2: Ops<B1, B2>, o3: Ops<B2, B3>, o4: Ops<B3, B4>, o5: Ops<B5, O>): Ops<I, I>
  <B1, B2, B3, B4, B5, B6>(
    o1: Ops<I, B1>,
    o2: Ops<B1, B2>,
    o3: Ops<B2, B3>,
    o4: Ops<B3, B4>,
    o5: Ops<B5, B6>,
    ...oos: Ops<unknown, O>[]
  ): Ops<I, I>
}

export type Behavior<A, B = A> = [Stream<B>, Tether<A, B>]

export interface Op {
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
