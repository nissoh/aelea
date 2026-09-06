import { PropagateTask } from '../scheduler/PropagateTask.js'
import type { IScheduler, ISink, IStream, ITime } from '../types.js'
import { disposeNone } from '../utils/disposable.js'
import { tryEvent } from '../utils/sink.js'

/**
 * Creates a stream that emits the current time at regular intervals
 *
 * periodic(3): ---3--6--9-->
 */
export const periodic = (interval: ITime): IStream<ITime> => new Periodic(interval)

class Periodic implements IStream<ITime> {
  constructor(readonly interval: ITime) {}

  run(sink: ISink<ITime>, scheduler: IScheduler): Disposable {
    const task = new PeriodicTask(sink, scheduler, this.interval)
    task.scheduled = scheduler.delay(task, this.interval)
    return task
  }
}

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
    tryEvent(this.sink, time, time)
    if (this.active) this.scheduled = this.scheduler.delay(this, this.interval)
  }

  override [Symbol.dispose](): void {
    if (!this.active) return
    this.active = false
    const scheduled = this.scheduled
    this.scheduled = disposeNone
    scheduled[Symbol.dispose]()
  }
}
