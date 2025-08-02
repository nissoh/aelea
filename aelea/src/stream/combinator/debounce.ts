import { stream } from '../stream.js'
import type { IStream, Scheduler, Sink } from '../types.js'
import { curry2 } from '../utils/function.js'

export interface IDebounceCurry {
  <T>(delay: number, source: IStream<T>): IStream<T>
  <T>(delay: number): (source: IStream<T>) => IStream<T>
}

export const debounce: IDebounceCurry = curry2((period, source) =>
  stream((scheduler, sink) => new DebounceSink(period, source, sink, scheduler))
)

class DebounceSink<T> implements Sink<T>, Disposable {
  pendingValue: { value: T } | null = null
  timer: Disposable | null = null
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
    this.pendingValue = { value }
    this.timer = this.scheduler.delay(this.sink, emitDebounced, this.dt, this)
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
    this.disposable[Symbol.dispose]()
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      this.timer[Symbol.dispose]()
      this.timer = null
    }
  }
}

function emitDebounced<T>(sink: Sink<T>, debounceSink: DebounceSink<T>): void {
  if (debounceSink.pendingValue !== null) {
    sink.event(debounceSink.pendingValue.value)
    debounceSink.pendingValue = null
  }
  debounceSink.timer = null
}
