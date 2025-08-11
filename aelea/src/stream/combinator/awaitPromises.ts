import { stream } from '../stream.js'
import type { ISink, IStream } from '../types.js'
import { disposeBoth } from '../utils/disposable.js'

/**
 * Turn a Stream of promises into a Stream containing the promises' values.
 * Event order is always preserved, regardless of promise fulfillment order.
 *
 * promise p:             ---1
 * promise q:             ------2
 * promise r:             -3
 * stream:                -p---q---r->
 * awaitPromises(stream): ---1--2--3->
 */
export const awaitPromises = <T>(s: IStream<Promise<T>>): IStream<T> =>
  stream((sink, scheduler) => {
    const awaitSink = new AwaitPromisesSink(sink)
    const disposable = s.run(awaitSink, scheduler)

    return disposeBoth(disposable, awaitSink)
  })

class AwaitPromisesSink<T> implements ISink<Promise<T>>, Disposable {
  private queue: Promise<unknown> = Promise.resolve()
  private sourceEnded = false
  private ended = false
  private disposed = false

  constructor(readonly sink: ISink<T>) {}

  event(promise: Promise<T>) {
    if (this.disposed) return

    this.queue = this.queue.then(() => promise.then(this.eventBound)).catch(this.errorBound)
  }

  end() {
    if (this.disposed) return

    this.sourceEnded = true
    // Queue the end event - it will only execute after all pending promises resolve
    this.queue = this.queue.then(this.endBound).catch(this.errorBound)
  }

  error(error: unknown): void {
    if (this.disposed) return

    this.sink.error(error)
  }

  // Pre-create closures to avoid creating them per event
  private eventBound = (value: T): void => {
    if (!this.disposed) {
      this.sink.event(value)
    }
  }

  private endBound = (): void => {
    if (!this.disposed && !this.ended) {
      this.ended = true
      this.sink.end()
    }
  }

  private errorBound = (error: any): void => {
    if (!this.disposed) {
      this.sink.error(error)
      // Only end if the source has ended
      if (this.sourceEnded && !this.ended) {
        this.ended = true
        this.sink.end()
      }
    }
  };

  [Symbol.dispose](): void {
    this.disposed = true
  }
}
