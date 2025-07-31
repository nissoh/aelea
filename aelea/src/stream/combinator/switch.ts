import { disposeNone } from '../disposable.js'
import type { IStream, Sink } from '../types.js'

export const switchLatest = <T>(s: IStream<IStream<T>>): IStream<T> => ({
  run(env, sink) {
    return s.run(env, new SwitchSink(env, sink))
  }
})

class InnerSink<T> implements Sink<T> {
  constructor(
    private sink: Sink<T>,
    private parent: SwitchSink<T>
  ) {}

  event(value: T): void {
    this.sink.event(value)
  }

  error(error: any): void {
    this.sink.error(error)
  }

  end(): void {
    this.parent.innerEnd()
  }
}

class SwitchSink<T> implements Sink<IStream<T>> {
  private currentDisposable: Disposable = disposeNone
  private outerEnded = false
  private innerEnded = false
  public readonly innerSink: InnerSink<T>

  constructor(
    private scheduler: any,
    private sink: Sink<T>
  ) {
    this.innerSink = new InnerSink(sink, this)
  }

  event(source: IStream<T>): void {
    // Dispose previous inner stream
    this.currentDisposable[Symbol.dispose]()
    this.innerEnded = false

    // Subscribe to new inner stream
    this.currentDisposable = source.run(this.scheduler, this.innerSink)
  }

  error(error: any): void {
    this.currentDisposable[Symbol.dispose]()
    this.outerEnded = true
    this.sink.error(error)
  }

  end(): void {
    this.outerEnded = true
    if ((this.outerEnded && this.innerEnded) || this.currentDisposable === disposeNone) {
      // End if both ended OR if no inner stream was ever emitted
      this.sink.end()
    }
  }

  innerEnd(): void {
    this.innerEnded = true
    if (this.outerEnded && this.innerEnded) {
      this.sink.end()
    }
  }

  dispose(): void {
    this.currentDisposable[Symbol.dispose]()
  }
}
