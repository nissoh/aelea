import { disposeNone } from '../disposable.js'
import type { IStream, Scheduler, Sink } from '../types.js'

export const switchLatest = <T>(s: IStream<IStream<T>>): IStream<T> => ({
  run(env, sink) {
    return s.run(env, new SwitchSink(env, sink))
  }
})

class SwitchSink<T> implements Sink<IStream<T>> {
  private currentDisposable: Disposable = disposeNone
  private outerEnded = false
  private innerEnded = false

  constructor(
    private scheduler: Scheduler,
    private sink: Sink<T>
  ) {}

  event(source: IStream<T>): void {
    // Dispose previous inner stream
    this.currentDisposable[Symbol.dispose]()
    this.innerEnded = false

    // Subscribe to new inner stream with direct sink delegation
    this.currentDisposable = source.run(this.scheduler, {
      event: (value: T) => this.sink.event(value),
      error: (error: any) => this.sink.error(error),
      end: () => {
        this.innerEnded = true
        if (this.outerEnded) {
          this.sink.end()
        }
      }
    })
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
