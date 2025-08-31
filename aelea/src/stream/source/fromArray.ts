import { propagateRunEventTask } from '../scheduler/PropagateTask.js'
import type { IScheduler, ISink, IStream, Time } from '../types.js'

export const fromArray = <T>(arr: readonly T[]): IStream<T> => new FromArray(arr)

class FromArray<T> implements IStream<T> {
  constructor(readonly arr: readonly T[]) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    return scheduler.asap(propagateRunEventTask(sink, emitArray, this.arr))
  }
}

function emitArray<T extends readonly unknown[]>(time: Time, sink: ISink<T[number]>, arr: T): void {
  for (const a of arr) {
    sink.event(time, a)
  }
  sink.end(time)
}
