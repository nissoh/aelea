import { PropagateTask, propagateEndTask } from '../scheduler/PropagateTask.js'
import type { IScheduler, ISink, IStream, ITime } from '../types.js'
import { disposeBoth } from '../utils/disposable.js'
import { curry2 } from '../utils/function.js'
import { PipeSink } from '../utils/sink.js'

/**
 * Delay each value by the specified time units
 *
 * stream:   -1-2-3->
 * delay(2): ---1-2-3->
 */
class Delay<T> implements IStream<T> {
  constructor(
    readonly delay: ITime,
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
  // Holds in-flight delayed tasks so dispose() can cancel them.
  readonly pending = new Set<Disposable>()

  constructor(
    readonly delay: ITime,
    override readonly sink: ISink<T>,
    readonly scheduler: IScheduler
  ) {
    super(sink)
  }

  event(_time: ITime, value: T): void {
    if (!this.active) return
    // One class instance per event instead of an `{ d }` literal + arrow
    // closure pair: same alloc count, known hidden class, no closure context.
    const task = new DelayedEventTask(this, value)
    this.pending.add(task)
    this.scheduler.delay(task, this.delay)
  }

  override end(_time: ITime): void {
    if (!this.active) return
    this.pending.add(this.scheduler.delay(propagateEndTask(this.sink), this.delay))
  }

  [Symbol.dispose](): void {
    this.active = false
    for (const d of this.pending) d[Symbol.dispose]()
    this.pending.clear()
  }
}

class DelayedEventTask<T> extends PropagateTask<T> {
  constructor(
    readonly parent: DelaySink<T>,
    readonly value: T
  ) {
    super(parent.sink)
  }

  runIfActive(time: ITime): void {
    this.parent.pending.delete(this)
    this.sink.event(time, this.value)
  }
}

export interface IDelayCurry {
  <T>(delay: ITime, source: IStream<T>): IStream<T>
  <T>(delay: ITime): (source: IStream<T>) => IStream<T>
}
