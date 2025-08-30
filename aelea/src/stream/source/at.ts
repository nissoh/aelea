import { propagateRunTask } from '../scheduler/PropagateTask.js'
import type { IScheduler, ISink, IStream } from '../types.js'

/**
 * Stream that emits a single value after a specified delay
 */
class At implements IStream<number> {
  constructor(readonly delay: number) {}

  run(sink: ISink<number>, scheduler: IScheduler): Disposable {
    return scheduler.delay(propagateRunTask(sink, emitOnce), this.delay)
  }
}

function emitOnce(time: number, sink: ISink<number>) {
  sink.event(time, time)
  sink.end(time)
}

export const at = (delay: number) => new At(delay)
