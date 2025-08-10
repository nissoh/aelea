import { type ISink, type IStream, stream } from '../stream/index.js'

export enum PromiseStatus {
  DONE,
  PENDING,
  ERROR
}

export type PromiseStateDone<T> = { status: PromiseStatus.DONE; value: T }
export type PromiseStatePending = { status: PromiseStatus.PENDING }
export type PromiseStateError = { status: PromiseStatus.ERROR; error: Error }
export type PromiseState<T> = PromiseStateDone<T> | PromiseStatePending | PromiseStateError

export const promiseState = <T>(querySrc: IStream<Promise<T>>): IStream<PromiseState<T>> => {
  return stream((sink, scheduler) => querySrc.run(new PromiseStateSink(sink), scheduler))
}

class PromiseStateSink<T> implements ISink<Promise<T>>, Disposable {
  private latestPromise: Promise<T> | null = null
  private isPending = false
  private sourceEnded = false
  private abortController?: AbortController

  constructor(private readonly sink: ISink<PromiseState<T>>) {}

  event(promise: Promise<T>): void {
    this.latestPromise = promise

    // Cancel previous pending operations if supported
    this.abortController?.abort()
    this.abortController = new AbortController()

    if (!this.isPending) {
      this.isPending = true
      this.sink.event({ status: PromiseStatus.PENDING })
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

  private handleResult(promise: Promise<T>, state: PromiseState<T>): void {
    // Ignore outdated promises
    if (promise !== this.latestPromise) return

    this.isPending = false
    this.sink.event(state)

    // If source has ended and this was the last pending promise, end the stream
    if (this.sourceEnded) {
      this.sink.end()
    }
  }

  end(): void {
    this.sourceEnded = true
    // Only end immediately if no promise is pending
    if (!this.isPending) {
      this.sink.end()
    }
    // Otherwise, wait for the pending promise to complete in handleResult
  }

  error(e: unknown): void {
    this.sink.error(e)
  }

  [Symbol.dispose](): void {
    this.abortController?.abort()
  }
}
