import { disposeBoth, type IScheduler, type ISink, type IStream, type ITime, tryEvent } from '../../stream/index.js'

export enum PromiseStatus {
  DONE,
  PENDING,
  ERROR
}

export type PromiseStateDone<T> = { status: PromiseStatus.DONE; value: T }
export type PromiseStatePending = { status: PromiseStatus.PENDING }
export type PromiseStateError = { status: PromiseStatus.ERROR; error: unknown }
export type PromiseState<T> = PromiseStateDone<T> | PromiseStatePending | PromiseStateError

const PENDING_STATE: PromiseStatePending = { status: PromiseStatus.PENDING }

/**
 * Lift a stream of promises into a stream of `{ status, value | error }`
 * snapshots. Latest-wins: if a new promise arrives before the previous one
 * settles, the older promise's eventual resolution is silently dropped.
 *
 * source:       -p-q|
 * p resolves:   -----a       (stale; identity check drops)
 * q resolves:   --------b
 * promiseState: -P------D|
 *   where P = { status: PENDING }
 *         D = { status: DONE, value: 'b' }
 */
export const promiseState = <T>(source: IStream<Promise<T>>): IStream<PromiseState<T>> => new PromiseStateStream(source)

class PromiseStateStream<T> implements IStream<PromiseState<T>> {
  constructor(readonly source: IStream<Promise<T>>) {}

  run(sink: ISink<PromiseState<T>>, scheduler: IScheduler): Disposable {
    const promiseSink = new PromiseStateSink(sink, scheduler)
    return disposeBoth(this.source.run(promiseSink, scheduler), promiseSink)
  }
}

class PromiseStateSink<T> implements ISink<Promise<T>>, Disposable {
  private latestPromise: Promise<T> | null = null
  private isPending = false
  private sourceEnded = false
  private disposed = false

  constructor(
    private readonly sink: ISink<PromiseState<T>>,
    private readonly scheduler: IScheduler
  ) {}

  event(time: ITime, promise: Promise<T>): void {
    this.latestPromise = promise

    if (!this.isPending) {
      this.isPending = true
      this.sink.event(time, PENDING_STATE)
    }

    promise.then(
      value => this.settle(promise, { status: PromiseStatus.DONE, value }),
      error => this.settle(promise, { status: PromiseStatus.ERROR, error })
    )
  }

  end(time: ITime): void {
    this.sourceEnded = true
    if (!this.isPending) this.sink.end(time)
  }

  error(time: ITime, e: unknown): void {
    this.sink.error(time, e)
  }

  [Symbol.dispose](): void {
    this.disposed = true
    this.latestPromise = null
  }

  private settle(promise: Promise<T>, result: PromiseState<T>): void {
    if (this.disposed || promise !== this.latestPromise) return
    this.isPending = false
    const time = this.scheduler.time()
    tryEvent(this.sink, time, result)
    if (this.sourceEnded) this.sink.end(time)
  }
}
