/**
 * Represents a stream of values that can be observed
 */
export interface IStream<T, S extends IScheduler = IScheduler> {
  run(sink: ISink<T>, scheduler: S): Disposable
}

/**
 * Factory function for creating a stream
 */
export type ICreateStream<T, S extends IScheduler> = (sink: ISink<T>, scheduler: S) => Disposable

/**
 * Observer interface for consuming stream values
 */
export interface ISink<T> {
  event(value: T): void
  error(error: unknown): void
  end(): void
}

export type IRunTask<TArgs extends readonly unknown[]> = (...args: TArgs) => void

/**
 * A scheduled task callback that receives a sink and optional arguments
 */
export interface ITask extends Disposable {
  run(): void
  active: boolean
}

/**
 * Scheduler interface for controlling the timing and execution of stream events.
 *
 * A scheduler is responsible for:
 * - Executing tasks at specific times or after delays
 * - Providing consistent time measurements across the stream
 * - Managing asynchronous task execution
 *
 * Different environments may implement schedulers differently:
 * - Browser: Uses setTimeout/requestAnimationFrame/queueMicrotask
 * - Node.js: Uses setTimeout/setImmediate/process.nextTick
 * - Test: May use virtual time for deterministic testing
 */
export interface IScheduler {
  /** Schedule a task to run after a specified delay */
  delay(task: ITask, delay: number): Disposable

  /** Schedule a task to run as soon as possible (next microtask) */
  asap(task: ITask): Disposable

  /** Get the current scheduler time in milliseconds */
  time(): number
}

/**
 * Generic function type
 */
export type Fn<T, R> = (a: T) => R

/**
 * Stream transformation function
 */
export type IOps<I, O = I> = Fn<IStream<I>, IStream<O>>

/**
 * Behavior is a stream paired with a composition function
 */
export type IBehavior<A, B = A> = [IStream<B>, IComposeBehavior<A, B>]

/**
 * Variadic function composition interface for behavior streams
 * Supports function composition with proper type flow
 */
export interface IComposeBehavior<I, O> {
  (): IOps<I>
  (o1: IOps<I, O>): IOps<I>
  <O1>(o1: IOps<I, O1>, o2: IOps<O1, O>): IOps<I>
  <O1, O2>(o1: IOps<I, O1>, o2: IOps<O1, O2>, o3: IOps<O2, O>): IOps<I>
  <O1, O2, O3>(o1: IOps<I, O1>, o2: IOps<O1, O2>, o3: IOps<O2, O3>, o4: IOps<O3, O>): IOps<I>
  <O1, O2, O3, O4>(o1: IOps<I, O1>, o2: IOps<O1, O2>, o3: IOps<O2, O3>, o4: IOps<O3, O4>, o5: IOps<O4, O>): IOps<I>
  <O1, O2, O3, O4, O5>(
    o1: IOps<I, O1>,
    o2: IOps<O1, O2>,
    o3: IOps<O2, O3>,
    o4: IOps<O3, O4>,
    o5: IOps<O4, O5>,
    o6: IOps<O5, O>
  ): IOps<I>
  <O1, O2, O3, O4, O5, O6>(
    o1: IOps<I, O1>,
    o2: IOps<O1, O2>,
    o3: IOps<O2, O3>,
    o4: IOps<O3, O4>,
    o5: IOps<O4, O5>,
    o6: IOps<O5, O6>,
    o7: IOps<O6, O>
  ): IOps<I>
  <O1, O2, O3, O4, O5, O6, O7>(
    o1: IOps<I, O1>,
    o2: IOps<O1, O2>,
    o3: IOps<O2, O3>,
    o4: IOps<O3, O4>,
    o5: IOps<O4, O5>,
    o6: IOps<O5, O6>,
    o7: IOps<O6, O7>,
    o8: IOps<O7, O>
  ): IOps<I>
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
  ): IOps<I>
  <O1, O2, O3, O4, O5, O6, O7, O8, O9>(
    o1: IOps<I, O1>,
    o2: IOps<O1, O2>,
    o3: IOps<O2, O3>,
    o4: IOps<O3, O4>,
    o5: IOps<O4, O5>,
    o6: IOps<O5, O6>,
    o7: IOps<O6, O7>,
    o8: IOps<O7, O8>,
    o9: IOps<O8, O9>,
    o10: IOps<O9, O>
  ): IOps<I>
  (...ops: IOps<any, any>[]): IOps<I>
}
