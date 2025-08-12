import { propagateRunEventTask } from '../scheduler/PropagateTask.js'
import type { IScheduler, ISink, IStream } from '../types.js'
import { disposeBoth } from '../utils/disposable.js'
import { curry2 } from '../utils/function.js'

/**
 * Stream that waits for a pause in values before emitting the latest one
 */
class Debounce<T> implements IStream<T> {
  constructor(
    private readonly period: number,
    private readonly source: IStream<T>
  ) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    const disposableSink = new DebounceSink(sink, scheduler, this.period)
    return disposeBoth(disposableSink, this.source.run(disposableSink, scheduler))
  }
}

/**
 * Wait for a pause in values before emitting the latest one
 *
 * stream:        -1-2-3-------4-5-------6->
 * debounce(3):   -------3---------5-------6->
 */
export const debounce: IDebounceCurry = curry2((period, source) => new Debounce(period, source))

class DebounceSink<T> implements ISink<T>, Disposable {
  pendingValue: { value: T } | null = null
  timer: Disposable | null = null

  constructor(
    readonly sink: ISink<T>,
    readonly scheduler: IScheduler,
    readonly dt: number
  ) {}

  event(value: T): void {
    this.clearTimer()
    this.pendingValue = { value }
    this.timer = this.scheduler.delay(propagateRunEventTask(this.sink, emitDebounced, this), this.dt)
  }

  error(e: Error): void {
    this.clearTimer()
    this.sink.error(e)
  }

  end(): void {
    // Emit pending value if any
    if (this.timer !== null && this.pendingValue !== null) {
      this.clearTimer()
      this.sink.event(this.pendingValue.value)
      this.pendingValue = null
    }
    this.sink.end()
  }

  [Symbol.dispose](): void {
    this.clearTimer()
  }

  clearTimer(): void {
    if (this.timer !== null) {
      this.timer[Symbol.dispose]()
      this.timer = null
    }
  }
}

function emitDebounced<T>(sink: ISink<T>, debounceSink: DebounceSink<T>): void {
  if (debounceSink.pendingValue !== null) {
    sink.event(debounceSink.pendingValue.value)
    debounceSink.pendingValue = null
  }
  debounceSink.timer = null
}

export interface IDebounceCurry {
  <T>(delay: number, source: IStream<T>): IStream<T>
  <T>(delay: number): (source: IStream<T>) => IStream<T>
}
