import { disposeBoth } from '../disposable.js'
import { curry2 } from '../function.js'
import type { Disposable, IStream, Sink } from '../types.js'

export interface IContinueWithCurry {
  <T>(f: () => IStream<T>, s: IStream<T>): IStream<T>
  <T>(f: () => IStream<T>): (s: IStream<T>) => IStream<T>
}

export const continueWith: IContinueWithCurry = curry2((f, s) => ({
  run(scheduler, sink) {
    const dsink = new ContinueWithSink(scheduler, sink, f)

    return disposeBoth(s.run(scheduler, dsink), dsink)
  }
}))

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
    try {
      const nextStream = this.f()
      this.disposable = nextStream.run(this.env, this.sink)
    } catch (error) {
      this.sink.error(error)
    }
  }

  setDisposable(d: Disposable): void {
    this.disposable = d
  }

  [Symbol.dispose](): void {
    if (this.disposable) {
      this.disposable[Symbol.dispose]()
    }
  }
}
