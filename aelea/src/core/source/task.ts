import { propagateTask } from '@most/core'
import { asap } from '@most/scheduler'
import type { Scheduler, Sink, Stream, Time } from '@most/types'
import type { Fn } from '../common.js'

export const task = <T, R>(value: T, apply: Fn<T, R>): IStream<R> => new TaskSource(value, apply)

class TaskSource<T, R> implements Stream<R> {
  constructor(
    private readonly value: T,
    private readonly apply: Fn<T, R>
  ) {}

  run(sink: Sink<R>, scheduler: Scheduler): Disposable {
    return asap(propagateTask(runAt, this.apply(this.value), sink), scheduler)
  }
}

function runAt<T>(t: Time, x: T, sink: Sink<T>): void {
  sink.event(t, x)
  sink.end(t)
}
