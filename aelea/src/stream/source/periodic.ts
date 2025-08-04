import { stream } from '../stream.js'
import type { IScheduler, ISink, IStream } from '../types.js'
import { curry2 } from '../utils/function.js'

export const periodic: IPeriodicCurry = curry2((period, value) =>
  stream((sink, scheduler) => new PeriodicTask(scheduler, sink, period, value))
)

class PeriodicTask<T> implements Disposable {
  private currentDisposable: Disposable | null = null

  constructor(
    private readonly scheduler: IScheduler,
    private readonly sink: ISink<T>,
    private readonly period: number,
    private readonly value: T
  ) {
    this.currentDisposable = this.scheduler.delay(eventPeriodic, this.period, this)
  }

  emit(): void {
    try {
      this.sink.event(this.value)
      this.currentDisposable = this.scheduler.delay(eventPeriodic, this.period, this)
    } catch (error) {
      this.sink.error(error)
    }
  }

  [Symbol.dispose](): void {
    this.currentDisposable?.[Symbol.dispose]()
  }
}

function eventPeriodic<T>(task: PeriodicTask<T>): void {
  task.emit()
}

export interface IPeriodicCurry {
  <T>(period: number, value: T): IStream<T>
  <T>(period: number): (value: T) => IStream<T>
}
