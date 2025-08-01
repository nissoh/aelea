import { curry2 } from '../function.js'
import type { IStream, Scheduler, Sink } from '../types.js'

export interface IDebounceCurry {
  <T>(delay: number, source: IStream<T>): IStream<T>
  <T>(delay: number): (source: IStream<T>) => IStream<T>
}

/**
 * Wait for a burst of events to subside and emit only the last event in the burst
 * @param period events occuring more frequently than this will be suppressed
 * @param stream stream to debounce
 * @returns new debounced stream
 */
export const debounce: IDebounceCurry = curry2((period, source) => ({
  run(scheduler, sink) {
    return new DebounceSink(period, source, sink, scheduler)
  }
}))

class DebounceSink<T> implements Sink<T>, Disposable {
  private value: T | undefined
  private timer: any = null
  private readonly disposable: Disposable

  constructor(
    private readonly dt: number,
    source: IStream<T>,
    private readonly sink: Sink<T>,
    private readonly scheduler: Scheduler
  ) {
    this.disposable = source.run(scheduler, this)
  }

  event(value: T): void {
    this.clearTimer()
    this.value = value
    this.timer = this.scheduler.delay(this.sink, this.handleTask, this.dt)
  }

  error(e: Error): void {
    this.clearTimer()
    this.sink.error(e)
  }

  end(): void {
    if (this.clearTimer()) {
      // Emit pending value if timer was active
      this.sink.event(this.value!)
      this.value = undefined
    }
    this.sink.end()
  }

  [Symbol.dispose](): void {
    this.clearTimer()
    this.disposable[Symbol.dispose]()
  }

  handleTask = () => {
    this.clearTimer()
    this.sink.event(this.value!)
  }

  private clearTimer(): boolean {
    if (this.timer === null) {
      return false
    }
    if (this.timer.cancel) {
      this.timer.cancel()
    } else {
      clearTimeout(this.timer)
    }
    this.timer = null
    return true
  }
}
