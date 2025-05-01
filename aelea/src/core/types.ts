import type { Stream } from '@most/types'

export type Os<I, O> = (s: Stream<I>) => Stream<O>

export interface Tether<A, B> {
  (): Os<A, A>
  (o1: Os<A, B>): Os<A, A>
  <O1>(o1: Os<A, O1>, o2: Os<O1, B>): Os<A, A>
  <O1, O2>(o1: Os<A, O1>, o2: Os<O1, O2>, o3: Os<O2, B>): Os<A, A>
  <O1, O2, O3>(
    o1: Os<A, O1>,
    o2: Os<O1, O2>,
    o3: Os<O2, O3>,
    o4: Os<O3, B>,
  ): Os<A, A>
  <B1, B2, B3, B4>(
    o1: Os<A, B1>,
    o2: Os<B1, B2>,
    o3: Os<B2, B3>,
    o4: Os<B3, B4>,
    o5: Os<B4, B>,
  ): Os<A, A>
  <B1, B2, B3, B4, B5>(
    o1: Os<A, B1>,
    o2: Os<B1, B2>,
    o3: Os<B2, B3>,
    o4: Os<B3, B4>,
    o5: Os<B5, B>,
  ): Os<A, A>
  <B1, B2, B3, B4, B5, B6>(
    o1: Os<A, B1>,
    o2: Os<B1, B2>,
    o3: Os<B2, B3>,
    o4: Os<B3, B4>,
    o5: Os<B5, B6>,
    ...oos: Os<unknown, B>[]
  ): Os<A, A>
}

export type Behavior<A, B = A> = [Stream<B>, Tether<A, B>]
