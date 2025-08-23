import { propagateRunEventTask } from '../scheduler/PropagateTask.js'
import type { IScheduler, ISink, IStream } from '../types.js'
import { curry2 } from '../utils/function.js'

/**
 * Stream that emits a single value after a specified delay
 */
class At<T> implements IStream<T> {
  constructor(
    readonly delay: number,
    readonly value: T
  ) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    return scheduler.delay(propagateRunEventTask(sink, emitOnce, this.value), this.delay)
  }
}

function emitOnce<T>(sink: ISink<T>, value: T) {
  sink.event(value)
  sink.end()
}

export const at: IAtCurry = curry2((delay, value) => new At(delay, value))

export interface IAtCurry {
  <T>(delay: number, value: T): IStream<T>
  <T>(delay: number): (value: T) => IStream<T>
}
