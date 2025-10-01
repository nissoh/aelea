import type { IScheduler, ISink, IStream, ITime } from '../types.js'
import { curry2 } from '../utils/function.js'
import { PipeSink } from '../utils/sink.js'

/**
 * Stream that limits the rate of events to at most one per period
 */
class Throttle<T> implements IStream<T> {
  constructor(
    readonly interval: ITime,
    readonly source: IStream<T>
  ) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    return this.source.run(new ThrottleSink(this.interval, sink), scheduler)
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
    readonly interval: ITime,
    sink: ISink<T>
  ) {
    super(sink)
  }

  event(time: ITime, value: T): void {
    if (time >= this.lastTime + this.interval) {
      this.lastTime = time
      this.sink.event(time, value)
    }
  }
}

export interface IThrottleCurry {
  <T>(interval: ITime, source: IStream<T>): IStream<T>
  <T>(interval: ITime): (source: IStream<T>) => IStream<T>
}
