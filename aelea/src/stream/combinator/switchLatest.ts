import { stream } from '../stream.js'
import type { IScheduler, ISink, IStream } from '../types.js'
import { disposeNone } from '../utils/disposable.js'

/**
 * Switch to the latest inner stream, cancelling the previous one
 *
 * stream of streams: -s1----s2----s3->
 *           s1:      -a-b-c-|
 *           s2:            -d-e-f-|
 *           s3:                  -g-h->
 * switchLatest:      -a-b-c-d-e-f-g-h->
 */
export const switchLatest = <T>(souce: IStream<IStream<T>>): IStream<T> =>
  stream((sink, scheduler) => souce.run(new SwitchSink(scheduler, sink), scheduler))

class SwitchSink<T> implements ISink<IStream<T>> {
  currentDisposable: Disposable = disposeNone
  outerEnded = false
  innerEnded = false

  private innerSink: InnerSink<T>

  constructor(
    private scheduler: IScheduler,
    private sink: ISink<T>
  ) {
    this.innerSink = new InnerSink(this, sink)
  }

  event(source: IStream<T>): void {
    this.currentDisposable[Symbol.dispose]()
    this.innerEnded = false
    this.currentDisposable = source.run(this.innerSink, this.scheduler)
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

class InnerSink<T> implements ISink<T> {
  constructor(
    private parent: SwitchSink<T>,
    private sink: ISink<T>
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
