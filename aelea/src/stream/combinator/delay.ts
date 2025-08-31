import { propagateEndTask, propagateRunEventTask } from '../scheduler/PropagateTask.js'
import type { IScheduler, ISink, IStream, Time } from '../types.js'
import { disposeBoth } from '../utils/disposable.js'
import { curry2 } from '../utils/function.js'
import { PipeSink } from '../utils/sink.js'

/**
 * Delay each value by the specified time units
 *
 * stream:     -1-2-3->
 * delay(2):   ---1-2-3->
 */
class Delay<T> implements IStream<T> {
  constructor(
    readonly delay: Time,
    readonly source: IStream<T>
  ) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    const disposableSink = new DelaySink(this.delay, sink, scheduler)
    return disposeBoth(this.source.run(disposableSink, scheduler), disposableSink)
  }
}

export const delay: IDelayCurry = curry2((n, source) => new Delay(n, source))

class DelaySink<T> extends PipeSink<T> implements Disposable {
  private active = true
  readonly disposableList: Disposable[] = []

  constructor(
    readonly delay: Time,
    override readonly sink: ISink<T>,
    readonly scheduler: IScheduler
  ) {
    super(sink)
  }

  event(_time: Time, value: T): void {
    if (!this.active) return
    this.disposableList.push(this.scheduler.delay(propagateRunEventTask(this.sink, emitDelay, value), this.delay))
  }

  override end(_time: Time): void {
    if (!this.active) return
    this.disposableList.push(this.scheduler.delay(propagateEndTask(this.sink), this.delay))
  }

  [Symbol.dispose](): void {
    this.active = false
    for (const d of this.disposableList) d[Symbol.dispose]()
    this.disposableList.length = 0
  }
}

function emitDelay<T>(time: Time, sink: ISink<T>, value: T): void {
  sink.event(time, value)
}

export interface IDelayCurry {
  <T>(delay: Time, source: IStream<T>): IStream<T>
  <T>(delay: Time): (source: IStream<T>) => IStream<T>
}
