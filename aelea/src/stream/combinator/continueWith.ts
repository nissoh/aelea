import type { Disposable, IStream, Sink } from '../types.js'

export const continueWith =
  <T>(f: () => IStream<T>) =>
  (s: IStream<T>): IStream<T> => ({
    run(scheduler, sink) {
      const continueWithSink = new ContinueWithSink(scheduler, sink, f)
      const d = s.run(scheduler, continueWithSink)
      continueWithSink.setDisposable(d)

      return {
        [Symbol.dispose](): void {
          continueWithSink.dispose()
        }
      }
    }
  })

class ContinueWithSink<T> implements Sink<T> {
  private disposable: Disposable | null = null

  constructor(
    private env: any,
    private sink: Sink<T>,
    private f: () => IStream<T>
  ) {}

  event(value: T): void {
    this.sink.event(value)
  }

  error(error: any): void {
    this.sink.error(error)
  }

  end(): void {
    if (this.disposable) {
      this.disposable[Symbol.dispose]()
    }
    this.disposable = this.f().run(this.env, this.sink)
  }

  setDisposable(d: Disposable): void {
    this.disposable = d
  }

  dispose(): void {
    if (this.disposable) {
      this.disposable[Symbol.dispose]()
    }
  }
}
