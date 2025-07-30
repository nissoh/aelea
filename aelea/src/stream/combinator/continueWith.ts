import type { Disposable, IStream, Sink } from '../types.js'

export const continueWith =
  <T, E>(f: () => IStream<T, E>) =>
  (s: IStream<T, E>): IStream<T, E> =>
  (env, sink) => {
    const continueWithSink = new ContinueWithSink(env, sink, f)
    const d = s(env, continueWithSink)
    continueWithSink.setDisposable(d)

    return {
      [Symbol.dispose](): void {
        continueWithSink.dispose()
      }
    }
  }

class ContinueWithSink<T, E> implements Sink<T> {
  private disposable: Disposable | null = null

  constructor(
    private env: E,
    private sink: Sink<T>,
    private f: () => IStream<T, E>
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
    this.disposable = this.f()(this.env, this.sink)
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
