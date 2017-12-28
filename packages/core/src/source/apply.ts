import { Disposable, Scheduler, Sink, Stream } from '@most/types'


export interface DisposableValue<T> extends Disposable {
  value: T
}

export type resolveFn<T> = () => DisposableValue<T>


export class ApplyStream<T> implements Stream<T> {
  constructor (private rfn: resolveFn<T>) { }

  run (sink: Sink<T>, scheduler: Scheduler) {
    const disposableValue = this.rfn()

    sink.event(scheduler.currentTime(), disposableValue.value)

    return disposableValue
  }
}

export function applyStream<T> (rfn: resolveFn<T>) {
  return new ApplyStream(rfn)
}
