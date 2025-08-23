import { propagateRunTask } from '../scheduler/PropagateTask.js'
import type { IScheduler, ISink, IStream } from '../types.js'
import { curry2 } from '../utils/function.js'

/**
 * Stream that emits a value periodically at specified intervals
 */
class Periodic<T> implements IStream<T> {
  constructor(
    readonly period: number,
    readonly value: T
  ) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    let active = true

    const emitNext = () => {
      if (!active) return

      sink.event(this.value)

      if (active) {
        disposable = scheduler.delay(propagateRunTask(sink, emitNext), this.period)
      }
    }

    let disposable = scheduler.asap(propagateRunTask(sink, emitNext))

    return {
      [Symbol.dispose](): void {
        active = false
        disposable[Symbol.dispose]()
      }
    }
  }
}

export const periodic: IPeriodicCurry = curry2((period, value) => new Periodic(period, value))

export interface IPeriodicCurry {
  <T>(period: number, value: T): IStream<T>
  <T>(period: number): (value: T) => IStream<T>
}
