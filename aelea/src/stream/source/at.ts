import { propagateRunTask } from '../scheduler/PropagateTask.js'
import type { IScheduler, ISink, IStream, ITime } from '../types.js'
import { emitTime } from './wait.js'

/**
 * Emits the current time once the target time is reached, then ends.
 * A target already in the past is due, so it emits on the next tick.
 *
 * at(3) when current=1:  --3|
 * at(3) when current=5:  5|
 */
export const at = (time: ITime): IStream<ITime> => new At(time)

class At implements IStream<ITime> {
  constructor(readonly time: ITime) {}

  run(sink: ISink<ITime>, scheduler: IScheduler): Disposable {
    const task = propagateRunTask(sink, emitTime)
    const delay = this.time - scheduler.time()
    return delay > 0 ? scheduler.delay(task, delay) : scheduler.asap(task)
  }
}
