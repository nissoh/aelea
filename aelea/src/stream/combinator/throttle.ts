import { stream } from '../stream.js'
import type { IStream, Scheduler, Sink } from '../types.js'
import { curry2 } from '../utils/function.js'
import { PipeSink } from '../utils/sink.js'

export interface IThrottleCurry {
  <T>(period: number, source: IStream<T>): IStream<T>
  <T>(period: number): (source: IStream<T>) => IStream<T>
}

/**
 * Limit the rate of events to at most one per period milliseconds.
 *
 * @example
 * stream:               abcd----abcd---->
 * throttle(2, stream):  a-c-----a-c----->
 */
export const throttle: IThrottleCurry = curry2((period, source) =>
  stream((scheduler, sink) => source.run(scheduler, new ThrottleSink(period, sink, scheduler)))
)

class ThrottleSink<T> extends PipeSink<T> {
  private lastTime = 0

  constructor(
    private readonly period: number,
    sink: Sink<T>,
    private readonly scheduler: Scheduler
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
