/**
 * Factory function for creating a stream
 */
export type ICreateStream<A, S extends IScheduler> = (scheduler: S, sink: ISink<A>) => Disposable

/**
 * Represents a stream of values that can be observed
 */
export interface IStream<T> {
  run<S extends IScheduler>(scheduler: S, sink: ISink<T>): Disposable
}

/**
 * Observer interface for consuming stream values
 */
export interface ISink<T> {
  event(value: T): void
  error(error: unknown): void
  end(): void
}

/**
 * Common type constraint for function arguments
 */
export type Args = readonly unknown[]

/**
 * A scheduled task callback that receives a sink and optional arguments
 */
export type ITask<T, TArgs extends Args> = (sink: ISink<T>, ...args: TArgs) => void

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
  /**
   * Schedule a task to run after a specified delay
   * @param sink - The sink to pass to the callback
   * @param task - Function to execute with (sink, ...args)
   * @param delay - Delay in milliseconds
   * @param args - Additional arguments to pass to callback
   */
  delay<T, TArgs extends Args>(sink: ISink<T>, task: ITask<T, TArgs>, delay: number, ...args: TArgs): Disposable

  /**
   * Schedule a task to run as soon as possible (next microtask)
   * @param sink - The sink to pass to the callback
   * @param task - Function to execute with (sink, ...args)
   * @param args - Additional arguments to pass to task
   */
  asap<T, TArgs extends Args>(sink: ISink<T>, task: ITask<T, TArgs>, ...args: TArgs): Disposable

  /**
   * Get the current scheduler time in milliseconds
   */
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
 */
export interface IComposeBehavior<I, O> {
  (): IOps<I, I>
  (o1: IOps<I, O>): IOps<I, I>
  <O1>(o1: IOps<I, O1>, o2: IOps<O1, O>): IOps<I, I>
  <O1, O2>(o1: IOps<I, O1>, o2: IOps<O1, O2>, o3: IOps<O2, O>): IOps<I, I>
  <O1, O2, O3>(o1: IOps<I, O1>, o2: IOps<O1, O2>, o3: IOps<O2, O3>, o4: IOps<O3, O>): IOps<I, I>
  <B1, B2, B3, B4>(o1: IOps<I, B1>, o2: IOps<B1, B2>, o3: IOps<B2, B3>, o4: IOps<B3, B4>, o5: IOps<B4, O>): IOps<I, I>
  <B1, B2, B3, B4, B5>(
    o1: IOps<I, B1>,
    o2: IOps<B1, B2>,
    o3: IOps<B2, B3>,
    o4: IOps<B3, B4>,
    o5: IOps<B5, O>
  ): IOps<I, I>
  <B1, B2, B3, B4, B5, B6>(
    o1: IOps<I, B1>,
    o2: IOps<B1, B2>,
    o3: IOps<B2, B3>,
    o4: IOps<B3, B4>,
    o5: IOps<B5, B6>,
    ...oos: IOps<unknown, O>[]
  ): IOps<I, I>
}
