import { PropagateTask } from '../index.js'
import type { IScheduler, ISink, IStream, Time } from '../types.js'

/**
 * Creates a stream that emits the current time at regular intervals
 *
 * periodic(3): ---3--6--9-->
 */
export const periodic = (interval: Time): IStream<Time> => new Periodic(interval)

/**
 * Stream that emits the current scheduler time at regular intervals
 */
class Periodic implements IStream<Time> {
  constructor(readonly interval: Time) {}

  run(sink: ISink<Time>, scheduler: IScheduler): Disposable {
    return scheduler.delay(new PeriodicTask(sink, scheduler, this.interval), this.interval)
  }
}

/**
 * Self-scheduling periodic task that emits values at intervals
 */
class PeriodicTask extends PropagateTask<Time> {
  constructor(
    readonly sink: ISink<Time>,
    readonly scheduler: IScheduler,
    readonly interval: Time
  ) {
    super(sink)
  }

  runIfActive(time: Time): void {
    this.sink.event(time, time)
    this.scheduler.delay(this, this.interval)
  }
}
