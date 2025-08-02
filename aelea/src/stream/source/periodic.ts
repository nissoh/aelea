import { stream } from '../stream.js'
import type { IStream, Scheduler, Sink } from '../types.js'
import { curry2 } from '../utils/function.js'

export interface IPeriodicCurry {
  <T>(period: number, value: T): IStream<T>
  <T>(period: number): (value: T) => IStream<T>
}
export const periodic: IPeriodicCurry = curry2((period, value) =>
  stream((scheduler, sink) => new PeriodicTask(scheduler, sink, period, value))
)

class PeriodicTask<T> implements Disposable {
  private currentDisposable: Disposable | null = null
  private disposed = false

  constructor(
    private readonly scheduler: Scheduler,
    private readonly sink: Sink<T>,
    private readonly period: number,
    private readonly value: T
  ) {
    this.scheduleNext()
  }

  private scheduleNext = (): void => {
    if (this.disposed) return

    this.sink.event(this.value)
    this.currentDisposable = this.scheduler.delay(this.sink, this.scheduleNext, this.period)
  };

  [Symbol.dispose](): void {
    this.disposed = true
    this.currentDisposable?.[Symbol.dispose]()
  }
}
