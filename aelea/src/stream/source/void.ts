import { propagateEndTask } from '../scheduler/PropagateTask.js'
import type { IScheduler, ISink, IStream } from '../types.js'
import { disposeNone } from '../utils/disposable.js'

/**
 * A stream that never emits any values and never ends
 *
 * never: ->
 */
export const never: IStream<never> = {
  run(_: ISink<never>, __: IScheduler): Disposable {
    return disposeNone
  }
}

/**
 * A stream that immediately ends without emitting any values
 *
 * empty: |
 */
export const empty: IStream<never> = {
  run(sink: ISink<never>, scheduler: IScheduler): Disposable {
    return scheduler.asap(propagateEndTask(sink))
  }
}
