import { disposeNone, PropagateTask } from '../index.js'
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
    const task = new PeriodicTask(sink, scheduler, this.interval)
    task.scheduled = scheduler.delay(task, this.interval)
    return task
  }
}

/**
 * Self-scheduling periodic task that emits values at intervals.
 * The task owns its currently-armed scheduler handle so disposing the
 * subscription cancels the in-flight timer of whichever generation is armed.
 */
class PeriodicTask extends PropagateTask<ITime> {
  scheduled: Disposable = disposeNone

  constructor(
    readonly sink: ISink<ITime>,
    readonly scheduler: IScheduler,
    readonly interval: ITime
  ) {
    super(sink)
  }

  runIfActive(time: ITime): void {
    this.sink.event(time, time)
    this.scheduled = this.scheduler.delay(this, this.interval)
  }

  override [Symbol.dispose](): void {
    // Guarded: the scheduler handle disposes this task back.
    if (!this.active) return
    this.active = false
    const scheduled = this.scheduled
    this.scheduled = disposeNone
    scheduled[Symbol.dispose]()
  }
}
