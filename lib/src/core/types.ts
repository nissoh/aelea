import type { Stream } from "@most/types"

export type Op<I, O> = (s: Stream<I>) => Stream<O>

export interface Tether<A, B> {
  (): Op<A, A>
  (o1: Op<A, B>): Op<A, A>
  <B1>(o1: Op<A, B1>, o2: Op<B1, B>): Op<A, A>
  <B1, B2>(o1: Op<A, B1>, o2: Op<B1, B2>, o3: Op<B2, B>): Op<A, A>
  <B1, B2, B3, B4>(o1: Op<A, B1>, o2: Op<B1, B2>, o3: Op<B2, B3>, o4: Op<B3, B4>): Op<A, A>
  <B1, B2, B3, B4, B5>(o1: Op<A, B1>, o2: Op<B1, B2>, o3: Op<B2, B3>, o4: Op<B3, B4>, o5: Op<B4, B5>): Op<A, A>
  <B1, B2, B3, B4, B5, B6>(o1: Op<A, B1>, o2: Op<B1, B2>, o3: Op<B2, B3>, o4: Op<B3, B4>, o5: Op<B5, B6>): Op<A, A>
  <B1, B2, B3, B4, B5, B6>(o1: Op<A, B1>, o2: Op<B1, B2>, o3: Op<B2, B3>, o4: Op<B3, B4>, o5: Op<B5, B6>, ...oos: Op<unknown, B>[]): Op<A, A>
}

export type Behavior<A, B = A> = [Stream<B>, Tether<A, B>]

