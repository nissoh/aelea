import { stream } from '../stream.js'
import type { IScheduler, ISink, IStream } from '../types.js'
import { curry2 } from '../utils/function.js'
import { PipeSink } from '../utils/sink.js'

/**
 * Limit the rate of events to at most one per period milliseconds
 *
 * stream:        -1-2-3-4-5-6-7-8->
 * throttle(2):   -1---3---5---7--->
 */
export const throttle: IThrottleCurry = curry2((period, source) =>
  stream((sink, scheduler) => source.run(new ThrottleSink(period, sink, scheduler), scheduler))
)

class ThrottleSink<T> extends PipeSink<T> {
  private lastTime = 0

  constructor(
    private readonly period: number,
    sink: ISink<T>,
    private readonly scheduler: IScheduler
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
