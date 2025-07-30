import { disposeNone } from '../core.js'
import type { Disposable, IStream, Sink } from '../types.js'

class InnerSink<T, E> implements Sink<T> {
  constructor(
    private sink: Sink<T>,
    private parent: SwitchSink<T, E>
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

class SwitchSink<T, E> implements Sink<IStream<T, E>> {
  private currentDisposable: Disposable = disposeNone
  private outerEnded = false
  private innerEnded = false
  public readonly innerSink: InnerSink<T, E>

  constructor(
    private env: E,
    private sink: Sink<T>
  ) {
    this.innerSink = new InnerSink(sink, this)
  }

  event(stream: IStream<T, E>): void {
    // Dispose previous inner stream
    this.currentDisposable[Symbol.dispose]()
    this.innerEnded = false

    // Subscribe to new inner stream
    this.currentDisposable = stream(this.env, this.innerSink)
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

export const lswitch =
  <T, E>(s: IStream<IStream<T, E>, E>): IStream<T, E> =>
  (env, sink) => {
    const switchSink = new SwitchSink(env, sink)
    const outerDisposable = s(env, switchSink)

    return {
      [Symbol.dispose](): void {
        outerDisposable[Symbol.dispose]()
        switchSink.dispose()
      }
    }
  }
