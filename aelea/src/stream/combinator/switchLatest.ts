import { stream } from '../stream.js'
import type { IScheduler, ISink, IStream } from '../types.js'
import { disposeBoth, disposeNone } from '../utils/disposable.js'

/**
 * Switch to the latest inner stream, disposing the previous one
 *
 * stream of streams: -s1----s2----s3->
 *           s1:      -a-b-c-|
 *           s2:            -d-e-f-|
 *           s3:                  -g-h->
 * switchLatest:      -a-b-c-d-e-f-g-h->
 */
export const switchLatest = <T>(source: IStream<IStream<T>>): IStream<T> =>
  stream((sink, scheduler) => {
    const switchSink = new SwitchSink(sink, scheduler)
    return disposeBoth(switchSink, source.run(switchSink, scheduler))
  })

class SwitchSink<T> implements ISink<IStream<T>>, Disposable {
  currentDisposable: Disposable = disposeNone
  innerSink: InnerSink<T>

  constructor(
    readonly sink: ISink<T>,
    readonly scheduler: IScheduler
  ) {
    this.innerSink = new InnerSink(this, sink)
  }

  event(inner: IStream<T>): void {
    this.disposeInner()
    this.currentDisposable = inner.run(this.innerSink, this.scheduler)
  }

  error(error: any): void {
    this.sink.error(error)
  }

  end(): void {
    this.disposeInner()
    this.sink.end()
  }

  [Symbol.dispose](): void {
    this.disposeInner()
  }

  disposeInner(): void {
    this.currentDisposable[Symbol.dispose]()
    this.currentDisposable = disposeNone
  }
}

class InnerSink<T> implements ISink<T> {
  constructor(
    readonly parent: SwitchSink<T>,
    readonly sink: ISink<T>
  ) {}

  event(value: T): void {
    this.sink.event(value)
  }

  error(error: any): void {
    this.sink.error(error)
  }

  end(): void {
    this.parent.disposeInner()
  }
}
