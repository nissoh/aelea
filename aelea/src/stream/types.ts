/**
 * Represents a stream of values that can be observed
 */
export interface IStream<T> {
  run(sink: ISink<T>, scheduler: IScheduler): Disposable
}

/**
 * A scheduled task callback that receives a sink and optional arguments
 */
export interface ITask extends Disposable {
  active: boolean
  run(time: ITime): void
  error(time: ITime, error: unknown): void
}

export type ITime = number

/**
 * Observer interface for consuming stream values
 */
export interface ISink<T> {
  event(time: ITime, value: T): void
  error(time: ITime, error: unknown): void
  end(time: ITime): void
}

/**
 * Scheduler interface for controlling the timing and execution of stream events.
 */
export interface IScheduler {
  /** Delay a task by a specified amount of time */
  delay(task: ITask, delay: ITime): Disposable

  /** Run as soon as possible (next microtask) */
  asap(task: ITask): Disposable

  /** Get elapsed time in milliseconds since this scheduler was created (starts at 0) */
  time(): ITime

  /** Get current wall-clock time in milliseconds (Unix timestamp like Date.now()) */
  dayTime(): ITime
}

/**
 * Generic function type
 */
export type Fn<T, R> = (a: T) => R

/**
 * Stream transformation function
 */
export type IOps<I, O = I> = Fn<IStream<I>, IStream<O>>

export interface IIdleScheduler {
  /** Resolves once no asap batch, delay timer or paint is outstanding */
  idle(): Promise<void>
}

export interface ISchedulerStats {
  asapDepth: number
  paintDepth: number
  drainPasses: number
  guardTrips: number
  taskErrors: number
}
