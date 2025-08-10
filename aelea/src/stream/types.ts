/**
 * Represents a stream of values that can be observed
 */
export interface IStream<T> {
  run(sink: ISink<T>, scheduler: IScheduler): Disposable
}

/**
 * Factory function for creating a stream
 */
export type ICreateStream<T> = <S extends IScheduler>(sink: ISink<T>, scheduler: S) => Disposable

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

