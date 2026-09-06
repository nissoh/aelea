import type { IScheduler, ISink, IStream, ITime } from '../types.js'
import { disposeBoth } from '../utils/disposable.js'
import { reportUncaught, tryEvent } from '../utils/sink.js'

class AwaitPromises<T> implements IStream<T> {
  constructor(readonly source: IStream<Promise<T>>) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    const awaitSink = new AwaitPromisesSink(sink, scheduler)
    const disposable = this.source.run(awaitSink, scheduler)

    return disposeBoth(disposable, awaitSink)
  }
}

/**
 * Turn a Stream of promises into a Stream containing the promises' values.
 * Source order is preserved for values, errors and end alike, regardless of
 * settlement order. A rejection is applicative: it is reported in its slot
 * and the queue continues.
 *
 * promise p:             ---1
 * promise q:             ------2
 * promise r:             -3
 * stream:                -p---q---r->
 * awaitPromises(stream): ---1--23--->
 */
export const awaitPromises = <T>(s: IStream<Promise<T>>): IStream<T> => new AwaitPromises(s)

class AwaitPromisesSink<T> implements ISink<Promise<T>>, Disposable {
  queue: Promise<unknown> = Promise.resolve()
  disposed = false

  constructor(
    readonly sink: ISink<T>,
    readonly scheduler: IScheduler
  ) {}

  event(_time: ITime, promise: Promise<T>): void {
    if (this.disposed) return
    this.queue = this.queue.then(() => promise.then(this.settle, this.reject)).catch(reportUncaught)
  }

  error(_time: ITime, error: unknown): void {
    if (this.disposed) return
    this.queue = this.queue.then(() => this.reject(error)).catch(reportUncaught)
  }

  end(_time: ITime): void {
    if (this.disposed) return
    this.queue = this.queue.then(this.finish).catch(reportUncaught)
  }

  settle = (value: T): void => {
    if (!this.disposed) tryEvent(this.sink, this.scheduler.time(), value)
  }

  reject = (error: unknown): void => {
    if (!this.disposed) this.sink.error(this.scheduler.time(), error)
  }

  finish = (): void => {
    if (!this.disposed) this.sink.end(this.scheduler.time())
  };

  [Symbol.dispose](): void {
    this.disposed = true
  }
}
