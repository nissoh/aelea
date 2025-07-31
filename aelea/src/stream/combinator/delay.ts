import { disposeBoth } from '../disposable.js'
import { curry2 } from '../function.js'
import { PipeSink } from '../sink.js'
import type { Disposable, IStream, Scheduler, Sink } from '../types.js'

export interface IDelayCurry {
  <T>(n: number, source: IStream<T>): IStream<T>
  <T>(n: number): (source: IStream<T>) => IStream<T>
}

/**
 * Delay each event by a fixed time period
 * @param n delay in milliseconds
 * @param source source stream
 * @returns stream with delayed events
 */
export const delay: IDelayCurry = curry2((n, source) => ({
  run(scheduler, sink) {
    const disposableSink = new DelaySink(n, scheduler, sink)

    return disposeBoth(source.run(scheduler, disposableSink), disposableSink)
  }
}))

class DelaySink<T> extends PipeSink<T> implements Disposable {
  private readonly disposableList: Disposable[] = []

  constructor(
    readonly n: number,
    readonly scheduler: Scheduler,
    override readonly sink: Sink<T>
  ) {
    super(sink)
  }

  event(value: T): void {
    this.disposableList.push(this.scheduler.schedule(this.sink.event, this.n, value))
  }

  override end(): void {
    this.disposableList.push(this.scheduler.schedule(this.sink.end, this.n))
  }

  [Symbol.dispose](): void {
    for (const d of this.disposableList.values()) d[Symbol.dispose]()
  }
}