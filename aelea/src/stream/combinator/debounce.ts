import { propagateRunEventTask } from '../scheduler/PropagateTask.js'
import type { IScheduler, ISink, IStream, ITime } from '../types.js'
import { disposeBoth } from '../utils/disposable.js'
import { curry2 } from '../utils/function.js'

/**
 * Stream that waits for a pause in values before emitting the latest one
 */
class Debounce<T> implements IStream<T> {
  constructor(
    readonly interval: ITime,
    readonly source: IStream<T>
  ) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    const disposableSink = new DebounceSink(sink, scheduler, this.interval)
    return disposeBoth(disposableSink, this.source.run(disposableSink, scheduler))
  }
}

/**
 * Wait for a pause in values before emitting the latest one
 *
 * stream:      -a-b-c-d-------e-f-------g->
 * debounce(3): ---------d---------f-------g->
 */
export const debounce: IDebounceCurry = curry2((period, source) => new Debounce(period, source))

class DebounceSink<T> implements ISink<T>, Disposable {
  pendingValue: { value: T } | null = null
  timer: Disposable | null = null

  constructor(
    readonly sink: ISink<T>,
    readonly scheduler: IScheduler,
    readonly interval: ITime
  ) {}

  event(time: ITime, value: T): void {
    this.clearTimer()
    this.pendingValue = { value }
    this.timer = this.scheduler.delay(propagateRunEventTask(this.sink, emitDebounced, this), this.interval)
  }

  error(time: ITime, e: Error): void {
    this.clearTimer()
    this.sink.error(time, e)
  }

  end(time: ITime): void {
    // Emit pending value if any
    if (this.timer !== null && this.pendingValue !== null) {
      this.clearTimer()
      this.sink.event(time, this.pendingValue.value)
      this.pendingValue = null
    }
    this.sink.end(time)
  }

  [Symbol.dispose](): void {
    this.clearTimer()
  }

  clearTimer(): void {
    if (this.timer !== null) {
      const t = this.timer
      this.timer = null // Clear before disposing to prevent circular disposal
      t[Symbol.dispose]()
    }
  }
}

function emitDebounced<T>(time: ITime, sink: ISink<T>, debounceSink: DebounceSink<T>): void {
  if (debounceSink.pendingValue !== null) {
    sink.event(time, debounceSink.pendingValue.value)
    debounceSink.pendingValue = null
  }
  debounceSink.timer = null
}

export interface IDebounceCurry {
  <T>(interval: ITime, source: IStream<T>): IStream<T>
  <T>(interval: ITime): (source: IStream<T>) => IStream<T>
}
