import type { IScheduler, ISink, IStream } from '../types.js'
import { curry2 } from '../utils/function.js'
import { PipeSink } from '../utils/sink.js'

/**
 * Stream that limits the rate of events to at most one per period
 */
class Throttle<T> implements IStream<T> {
  constructor(
    private readonly period: number,
    private readonly source: IStream<T>
  ) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    return this.source.run(new ThrottleSink(this.period, sink, scheduler), scheduler)
  }
}

/**
 * Limit the rate of events to at most one per period milliseconds
 *
 * stream:        -1-2-3-4-5-6-7-8->
 * throttle(2):   -1---3---5---7--->
 */
export const throttle: IThrottleCurry = curry2((period, source) => new Throttle(period, source))

class ThrottleSink<T> extends PipeSink<T> {
  lastTime = 0

  constructor(
    readonly period: number,
    sink: ISink<T>,
    readonly scheduler: IScheduler
  ) {
    super(sink)
  }

  event(value: T): void {
    const now = this.scheduler.time()

    if (now >= this.lastTime + this.period) {
      this.lastTime = now
      this.sink.event(value)
    }
  }
}

export interface IThrottleCurry {
  <T>(period: number, source: IStream<T>): IStream<T>
  <T>(period: number): (source: IStream<T>) => IStream<T>
}
