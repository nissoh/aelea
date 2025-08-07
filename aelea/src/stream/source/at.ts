import { propagateRunEventTask } from '../scheduler/PropagateTask.js'
import { stream } from '../stream.js'
import type { ISink, IStream } from '../types.js'
import { curry2 } from '../utils/function.js'

export const at: IAtCurry = curry2((delay, value) =>
  stream((sink, scheduler) => scheduler.delay(propagateRunEventTask(sink, scheduler, emitOnce, value), delay))
)

function emitOnce<T>(sink: ISink<T>, value: T) {
  sink.event(value)
  sink.end()
}

export interface IAtCurry {
  <T>(delay: number, value: T): IStream<T>
  <T>(delay: number): (value: T) => IStream<T>
}
