import { PropagateTask } from '../index.js'
import type { IScheduler, ISink, IStream } from '../types.js'

/**
 * Creates a stream that emits the current time at regular intervals
 *
 * periodic(3): ---3--6--9-->
 */
export const periodic = (period: number): IStream<number> => new Periodic(period)

/**
 * Stream that emits the current scheduler time at regular intervals
 */
class Periodic implements IStream<number> {
  constructor(readonly period: number) {}

  run(sink: ISink<number>, scheduler: IScheduler): Disposable {
    return scheduler.delay(new PeriodicTask(sink, scheduler, this.period), this.period)
  }
}

/**
 * Self-scheduling periodic task that emits values at intervals
 */
class PeriodicTask extends PropagateTask<number> {
  constructor(
    readonly sink: ISink<number>,
    readonly scheduler: IScheduler,
    readonly period: number
  ) {
    super(sink)
  }

  runIfActive(time: number): void {
    this.sink.event(time, time)
    this.scheduler.delay(this, this.period)
  }
}

function emitInitial(time: number, sink: ISink<number>): void {
  sink.event(time, time)
}
