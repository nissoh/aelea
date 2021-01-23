import { disposeOnce, tryDispose } from '@most/disposable'
import { Stream, Scheduler, Time, Disposable, Sink } from '@most/types'
import { Pipe, tryRunning } from 'core/src/utils'
import { withLocalTime } from '@most/core'

export const continueFrom = <A, B = A>(f: (a: A) => Stream<B>, stream: Stream<A>): Stream<A | B> =>
  new ContinueFrom(f, stream)

class ContinueFrom<A, B> implements Stream<A | B> {
  constructor(private f: (a: A) => Stream<B>,
              private source: Stream<A>) { }

  run(sink: Sink<A | B>, scheduler: Scheduler): Disposable {
    return new ContinueFromSink(this.f, this.source, sink, scheduler)
  }
}

class ContinueFromSink<A, B> extends Pipe<A, A | B> implements Sink<A>, Disposable {

  private active = true
  private disposable = disposeOnce(this.source.run(this, this.scheduler))
  private latestValue!: A
  private emittedValue = false

  constructor(private f: (a: A) => Stream<B>,
              private source: Stream<A>,
              public sink: Sink<A | B>,
              private scheduler: Scheduler) { super(sink) }

  event(t: Time, x: A): void {
    if (!this.active) 
      return

    this.emittedValue = true
    this.latestValue = x

    this.sink.event(t, x)
  }

  end(t: Time): void {
    if (!this.active) 
      return

    tryDispose(t, this.disposable, this.sink)

    if (this.emittedValue) {
      const continuedStream = withLocalTime(t, this.f(this.latestValue))
      this.disposable = tryRunning(continuedStream, this.sink, this.scheduler)
    }
  }


  dispose(): void {
    this.active = false
    return this.disposable.dispose()
  }
}
