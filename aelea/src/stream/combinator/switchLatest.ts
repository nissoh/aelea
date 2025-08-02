import { stream } from '../stream.js'
import type { IStream, Scheduler, Sink } from '../types.js'
import { disposeNone } from '../utils/disposable.js'

export const switchLatest = <T>(souce: IStream<IStream<T>>): IStream<T> =>
  stream((scheduler, sink) => souce.run(scheduler, new SwitchSink(scheduler, sink)))

class SwitchSink<T> implements Sink<IStream<T>> {
  currentDisposable: Disposable = disposeNone
  outerEnded = false
  innerEnded = false

  private innerSink: InnerSink<T>

  constructor(
    private scheduler: Scheduler,
    private sink: Sink<T>
  ) {
    this.innerSink = new InnerSink(this, sink)
  }

  event(source: IStream<T>): void {
    this.currentDisposable[Symbol.dispose]()
    this.innerEnded = false
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

class InnerSink<T> implements Sink<T> {
  constructor(
    private parent: SwitchSink<T>,
    private sink: Sink<T>
  ) {}

  event(value: T): void {
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
