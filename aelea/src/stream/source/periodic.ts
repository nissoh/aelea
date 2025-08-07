import { propagateRunEventTask } from '../scheduler/PropagateTask.js'
import { stream } from '../stream.js'
import type { IScheduler, ISink, IStream } from '../types.js'
import { curry2 } from '../utils/function.js'

export const periodic: IPeriodicCurry = curry2((period, value) =>
  stream((sink, scheduler) => new Periodic(scheduler, sink, period, value))
)

class Periodic<T> implements Disposable {
  currentDisposable: Disposable | null = null
  disposed = false

  constructor(
    readonly scheduler: IScheduler,
    readonly sink: ISink<T>,
    readonly period: number,
    readonly value: T
  ) {
    this.scheduleNext()
  }

  scheduleNext(): void {
    if (this.disposed) return

    this.currentDisposable = this.scheduler.delay(
      propagateRunEventTask(this.sink, this.scheduler, emitPeriodic, this),
      this.period
    )
  }

  [Symbol.dispose](): void {
    this.disposed = true
    this.currentDisposable?.[Symbol.dispose]()
  }
}

function emitPeriodic<T>(sink: ISink<T>, periodic: Periodic<T>): void {
  if (periodic.disposed) return

  sink.event(periodic.value)
  periodic.scheduleNext()
}

export interface IPeriodicCurry {
  <T>(period: number, value: T): IStream<T>
  <T>(period: number): (value: T) => IStream<T>
}
