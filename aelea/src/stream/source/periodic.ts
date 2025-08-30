import { PropagateTask, propagateRunEventTask } from '../index.js'
import type { IScheduler, ISink, IStream } from '../types.js'
import { disposeBoth } from '../utils/disposable.js'

interface IPeriodic<T> {
  period: number
  value: T
  startImmediate: boolean
}
export const periodic = <T>(config: IPeriodic<T>): IStream<T> => new Periodic(config)

/**
 * Stream that emits a value periodically at specified intervals
 */
class Periodic<T> implements IStream<T> {
  constructor(readonly config: IPeriodic<T>) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    const periodicDisposable = scheduler.delay(
      new PeriodicTask(sink, scheduler, this.config.period, this.config.value),
      this.config.period
    )

    if (this.config.startImmediate) {
      const initialDisposable = scheduler.asap(propagateRunEventTask(sink, emitInitial, this.config.value))
      return disposeBoth(initialDisposable, periodicDisposable)
    }

    return periodicDisposable
  }
}

/**
 * Self-scheduling periodic task that emits values at intervals
 */
class PeriodicTask<T> extends PropagateTask<T> {
  constructor(
    readonly sink: ISink<T>,
    readonly scheduler: IScheduler,
    readonly period: number,
    readonly value: T
  ) {
    super(sink)
  }

  runIfActive(time: number): void {
    this.sink.event(time, this.value)
    this.scheduler.delay(this, this.period)
  }
}

function emitInitial<O>(time: number, sink: ISink<O>, value: O): void {
  sink.event(time, value)
}
