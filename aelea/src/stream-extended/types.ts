import type { IOps, IStream } from '../stream/index.js'

/**
 * Behavior is a stream paired with a composition function
 */
export type IBehavior<A, B = A> = [IStream<B>, IComposeBehavior<A, B>]

type ISampler<T> = (source: IStream<T>) => IStream<T>

/**
 * Variadic function composition interface for behavior streams
 * Supports function composition with proper type flow
 */
export interface IComposeBehavior<A, B> {
  (): ISampler<A>
  (o1: IOps<A, B>): ISampler<A>
  <O1>(o1: IOps<A, O1>, o2: IOps<O1, B>): ISampler<A>
  <O1, O2>(o1: IOps<A, O1>, o2: IOps<O1, O2>, o3: IOps<O2, B>): ISampler<A>
  <O1, O2, O3>(o1: IOps<A, O1>, o2: IOps<O1, O2>, o3: IOps<O2, O3>, o4: IOps<O3, B>): ISampler<A>
  <O1, O2, O3, O4>(o1: IOps<A, O1>, o2: IOps<O1, O2>, o3: IOps<O2, O3>, o4: IOps<O3, O4>, o5: IOps<O4, B>): ISampler<A>
  <O1, O2, O3, O4, O5>(
    o1: IOps<A, O1>,
    o2: IOps<O1, O2>,
    o3: IOps<O2, O3>,
    o4: IOps<O3, O4>,
    o5: IOps<O4, O5>,
    o6: IOps<O5, B>
  ): ISampler<A>
  <O1, O2, O3, O4, O5, O6>(
    o1: IOps<A, O1>,
    o2: IOps<O1, O2>,
    o3: IOps<O2, O3>,
    o4: IOps<O3, O4>,
    o5: IOps<O4, O5>,
    o6: IOps<O5, O6>,
    o7: IOps<O6, B>
  ): ISampler<A>
  <O1, O2, O3, O4, O5, O6, O7>(
    o1: IOps<A, O1>,
    o2: IOps<O1, O2>,
    o3: IOps<O2, O3>,
    o4: IOps<O3, O4>,
    o5: IOps<O4, O5>,
    o6: IOps<O5, O6>,
    o7: IOps<O6, O7>,
    o8: IOps<O7, B>
  ): ISampler<A>
  <O1, O2, O3, O4, O5, O6, O7, O8>(
    o1: IOps<A, O1>,
    o2: IOps<O1, O2>,
    o3: IOps<O2, O3>,
    o4: IOps<O3, O4>,
    o5: IOps<O4, O5>,
    o6: IOps<O5, O6>,
    o7: IOps<O6, O7>,
    o8: IOps<O7, O8>,
    o9: IOps<O8, B>
  ): ISampler<A>
}
