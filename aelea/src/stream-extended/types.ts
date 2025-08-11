import type { IOps, IStream } from '../stream/index.js'

/**
 * Behavior is a stream paired with a composition function
 */
export type IBehavior<I, O = I> = [IStream<O>, IComposeBehavior<I, O>]

type IRunBehavior<I> = (source: IStream<I>) => IStream<I>

/**
 * Variadic function composition interface for behavior streams
 * Supports function composition with proper type flow
 */
export interface IComposeBehavior<I, O> {
  (): IRunBehavior<I>
  (o1: IOps<I, O>): IRunBehavior<I>
  <O1>(o1: IOps<I, O1>, o2: IOps<O1, O>): IRunBehavior<I>
  <O1, O2>(o1: IOps<I, O1>, o2: IOps<O1, O2>, o3: IOps<O2, O>): IRunBehavior<I>
  <O1, O2, O3>(o1: IOps<I, O1>, o2: IOps<O1, O2>, o3: IOps<O2, O3>, o4: IOps<O3, O>): IRunBehavior<I>
  <O1, O2, O3, O4>(
    o1: IOps<I, O1>,
    o2: IOps<O1, O2>,
    o3: IOps<O2, O3>,
    o4: IOps<O3, O4>,
    o5: IOps<O4, O>
  ): IRunBehavior<I>
  <O1, O2, O3, O4, O5>(
    o1: IOps<I, O1>,
    o2: IOps<O1, O2>,
    o3: IOps<O2, O3>,
    o4: IOps<O3, O4>,
    o5: IOps<O4, O5>,
    o6: IOps<O5, O>
  ): IRunBehavior<I>
  <O1, O2, O3, O4, O5, O6>(
    o1: IOps<I, O1>,
    o2: IOps<O1, O2>,
    o3: IOps<O2, O3>,
    o4: IOps<O3, O4>,
    o5: IOps<O4, O5>,
    o6: IOps<O5, O6>,
    o7: IOps<O6, O>
  ): IRunBehavior<I>
  <O1, O2, O3, O4, O5, O6, O7>(
    o1: IOps<I, O1>,
    o2: IOps<O1, O2>,
    o3: IOps<O2, O3>,
    o4: IOps<O3, O4>,
    o5: IOps<O4, O5>,
    o6: IOps<O5, O6>,
    o7: IOps<O6, O7>,
    o8: IOps<O7, O>
  ): IRunBehavior<I>
  <O1, O2, O3, O4, O5, O6, O7, O8>(
    o1: IOps<I, O1>,
    o2: IOps<O1, O2>,
    o3: IOps<O2, O3>,
    o4: IOps<O3, O4>,
    o5: IOps<O4, O5>,
    o6: IOps<O5, O6>,
    o7: IOps<O6, O7>,
    o8: IOps<O7, O8>,
    o9: IOps<O8, O>
  ): IRunBehavior<I>
}
