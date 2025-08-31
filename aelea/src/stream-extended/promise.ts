import type { IScheduler, ISink, IStream, Time } from '../stream/index.js'

export enum PromiseStatus {
  DONE,
  PENDING,
  ERROR
}

export type PromiseStateDone<T> = { status: PromiseStatus.DONE; value: T }
export type PromiseStatePending = { status: PromiseStatus.PENDING }
export type PromiseStateError = { status: PromiseStatus.ERROR; error: Error }
export type PromiseState<T> = PromiseStateDone<T> | PromiseStatePending | PromiseStateError

/**
 * Stream that transforms a stream of promises into a stream of promise states
 */
class PromiseStateStream<T> implements IStream<PromiseState<T>> {
  constructor(readonly source: IStream<Promise<T>>) {}

  run(sink: ISink<PromiseState<T>>, scheduler: IScheduler): Disposable {
    return this.source.run(new PromiseStateSink(sink), scheduler)
  }
}

export const promiseState = <T>(querySrc: IStream<Promise<T>>): IStream<PromiseState<T>> => {
  return new PromiseStateStream(querySrc)
}

class PromiseStateSink<T> implements ISink<Promise<T>>, Disposable {
  latestPromise: Promise<T> | null = null
  isPending = false
  sourceEnded = false
  abortController?: AbortController

  constructor(readonly sink: ISink<PromiseState<T>>) {}

  event(time: Time, promise: Promise<T>): void {
    this.latestPromise = promise

    // Cancel previous pending operations if supported
    this.abortController?.abort()
    this.abortController = new AbortController()

    if (!this.isPending) {
      this.isPending = true
      this.sink.event(time, { status: PromiseStatus.PENDING })
    }

    promise.then(
      value => this.handleResult(promise, { status: PromiseStatus.DONE, value }),
      error =>
        this.handleResult(promise, {
          status: PromiseStatus.ERROR,
          error: error instanceof Error ? error : new Error(String(error))
        })
    )
  }

  handleResult(promise: Promise<T>, state: PromiseState<T>): void {
    // Ignore outdated promises
    if (promise !== this.latestPromise) return

    this.isPending = false
    // We need to get current time for the event
    const currentTime = Date.now()
    this.sink.event(currentTime, state)

    // If source has ended and this was the last pending promise, end the stream
    if (this.sourceEnded) {
      this.sink.end(currentTime)
    }
  }

  end(time: Time): void {
    this.sourceEnded = true
    // Only end immediately if no promise is pending
    if (!this.isPending) {
      this.sink.end(time)
    }
    // Otherwise, wait for the pending promise to complete in handleResult
  }

  error(time: Time, e: unknown): void {
    this.sink.error(time, e)
  }

  [Symbol.dispose](): void {
    this.abortController?.abort()
  }
}
