import { disposeNone } from '../disposable.js'
import type { IStream, Scheduler, Sink } from '../types.js'

export const switchLatest = <T>(s: IStream<IStream<T>>): IStream<T> => ({
  run(scheduler, sink) {
    return s.run(scheduler, new SwitchSink(scheduler, sink))
  }
})

// Optimized inner sink to avoid object allocation
class InnerSink<T> implements Sink<T> {
  constructor(
    private parent: SwitchSink<T>,
    private sink: Sink<T>
  ) {}

  event(value: T): void {
    // Direct delegation without closure
    this.sink.event(value)
  }

  error(error: any): void {
    this.sink.error(error)
  }

  end(): void {
    this.parent.innerEnded = true
    if (this.parent.outerEnded) {
      this.sink.end()
    }
  }
}

class SwitchSink<T> implements Sink<IStream<T>> {
  currentDisposable: Disposable = disposeNone
  outerEnded = false
  innerEnded = false

  // Pre-create inner sink to avoid repeated allocations
  private innerSink: InnerSink<T>

  constructor(
    private scheduler: Scheduler,
    private sink: Sink<T>
  ) {
    this.innerSink = new InnerSink(this, sink)
  }

  event(source: IStream<T>): void {
    // Dispose previous inner stream
    this.currentDisposable[Symbol.dispose]()
    this.innerEnded = false

    // Subscribe to new inner stream with pre-created sink
    this.currentDisposable = source.run(this.scheduler, this.innerSink)
  }

  error(error: any): void {
    this.currentDisposable[Symbol.dispose]()
    this.sink.error(error)
  }

  end(): void {
    this.outerEnded = true
    if (this.innerEnded || this.currentDisposable === disposeNone) {
      this.sink.end()
    }
  }
}
