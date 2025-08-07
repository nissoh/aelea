import { propagateRunEventTask } from '../scheduler/PropagateTask.js'
import { stream } from '../stream.js'
import type { IScheduler, ISink, IStream } from '../types.js'
import { curry2 } from '../utils/function.js'

export const periodic: IPeriodicCurry = curry2((period, value) =>
  stream((sink, scheduler) => new Periodic(scheduler, sink, period, value))
)

class Periodic<T> implements Disposable {
  currentDisposable: Disposable | null = null

  constructor(
    readonly scheduler: IScheduler,
    readonly sink: ISink<T>,
    readonly period: number,
    readonly value: T
  ) {
    this.currentDisposable = this.scheduler.delay(
      propagateRunEventTask(sink, scheduler, eventPeriodic, value),
      this.period
    )
  }

  emit(): void {
    try {
      this.sink.event(this.value)
      this.currentDisposable = this.scheduler.delay(
        propagateRunEventTask(this.sink, this.scheduler, eventPeriodic, this.value),
        this.period
      )
    } catch (error) {
      this.sink.error(error)
    }
  }

  [Symbol.dispose](): void {
    this.currentDisposable?.[Symbol.dispose]()
  }
}

function eventPeriodic<T>(sink: ISink<T>, value: T): void {
  sink.event(value)
}

export interface IPeriodicCurry {
  <T>(period: number, value: T): IStream<T>
  <T>(period: number): (value: T) => IStream<T>
}
