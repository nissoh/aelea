import { PropagateTask } from '../index.js'
import type { IScheduler, ISink, IStream, ITime } from '../types.js'

/**
 * Creates a stream that emits the current time at regular intervals
 *
 * periodic(3): ---3--6--9-->
 */
export const periodic = (interval: ITime): IStream<ITime> => new Periodic(interval)

/**
 * Stream that emits the current scheduler time at regular intervals
 */
class Periodic implements IStream<ITime> {
  constructor(readonly interval: ITime) {}

  run(sink: ISink<ITime>, scheduler: IScheduler): Disposable {
    return scheduler.delay(new PeriodicTask(sink, scheduler, this.interval), this.interval)
  }
}

/**
 * Self-scheduling periodic task that emits values at intervals
 */
class PeriodicTask extends PropagateTask<ITime> {
  constructor(
    readonly sink: ISink<ITime>,
    readonly scheduler: IScheduler,
    readonly interval: ITime
  ) {
    super(sink)
  }

  runIfActive(time: ITime): void {
    this.sink.event(time, time)
    this.scheduler.delay(this, this.interval)
  }
}
