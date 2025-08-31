import { propagateErrorTask } from '../scheduler/PropagateTask.js'
import type { IScheduler, ISink, IStream } from '../types.js'

/**
 * Stream that immediately emits an error and ends
 *
 * throwError(new Error('oops')): X|
 */
export const throwError = <T = never>(error: unknown): IStream<T> => new ThrowError(error)

class ThrowError<T> implements IStream<T> {
  constructor(readonly error: unknown) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    return scheduler.asap(propagateErrorTask(sink, this.error))
  }
}
