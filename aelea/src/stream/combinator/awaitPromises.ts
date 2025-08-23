import type { IScheduler, ISink, IStream } from '../types.js'
import { disposeBoth } from '../utils/disposable.js'

/**
 * Stream that transforms a stream of promises into a stream of their values
 */
class AwaitPromises<T> implements IStream<T> {
  constructor(readonly source: IStream<Promise<T>>) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    const awaitSink = new AwaitPromisesSink(sink)
    const disposable = this.source.run(awaitSink, scheduler)

    return disposeBoth(disposable, awaitSink)
  }
}

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
export const awaitPromises = <T>(s: IStream<Promise<T>>): IStream<T> => new AwaitPromises(s)

class AwaitPromisesSink<T> implements ISink<Promise<T>>, Disposable {
  queue: Promise<unknown> = Promise.resolve()
  sourceEnded = false
  ended = false
  disposed = false

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
  eventBound = (value: T): void => {
    if (!this.disposed) {
      this.sink.event(value)
    }
  }

  endBound = (): void => {
    if (!this.disposed && !this.ended) {
      this.ended = true
      this.sink.end()
    }
  }

  errorBound = (error: any): void => {
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
