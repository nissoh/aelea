import { Scheduler, Sink, Stream } from '@most/types'
import { curry2 } from '@most/prelude'



export type resolveStreamFn<T, R> = (x: T) => Stream<R>

export class ApplyStream<T, R> implements Stream<R> {
  constructor (private rfn: resolveStreamFn<T, R>, private value: T) { }

  run (sink: Sink<R>, scheduler: Scheduler) {
    // sink.event(scheduler.currentTime(), )

    return this.rfn(this.value).run(sink, scheduler)
  }
}

export function applyStream<T, R> (rfn: resolveStreamFn<T, R>, value: T) {
  return new ApplyStream(rfn, value)
}

export const applyStreamCurry = curry2(applyStream)

