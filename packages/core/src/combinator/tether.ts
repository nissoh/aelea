import { disposeWith } from '@most/disposable';
import { remove } from '@most/prelude';
import { Stream, Disposable, Scheduler, Sink, Time } from '@most/types'
import { Pipe } from '../utils'


class SourceSink<A> implements Sink<A> {
  hasValue = false;
  value!: A;

  constructor(private parent: Tether<A>, private sink: Sink<A>) { }

  event(t: number, x: A): void {
    this.value = x
    this.hasValue = true

    this.sink.event(t, x)
    this.parent.bSink.forEach(s => s.event(t, x))
  }

  end(t: Time) {
    this.sink.end(t)
    // this.parent.bSink.forEach(s => s.end(t))
  }

  error(t: Time, e: Error): void {
    this.sink.error(t, e)
    // this.parent.bSink.forEach(s => s.error(t, e))
  }

}

class TetherSink<A> extends Pipe<A, A> {

  constructor(private tetherParent: Tether<A>, sink: Sink<A>) {
    super(sink)
  }

  event(t: number, x: A): void {
    this.sink.event(t, x)
  }
  // dispose() {
  //   this.tetherParent.bSink = null
  // }

}



export class Tether<A> implements Stream<A> {

  sSink: SourceSink<A> | null = null;
  bSink: TetherSink<A>[] = [];

  constructor(private source: Stream<A>) { }

  run(sink: SourceSink<A> | TetherSink<A>, scheduler: Scheduler): Disposable {

    if (sink instanceof SourceSink) {

      if (this.sSink) {
        throw new Error('Cannot split multiple sources')
      }

      this.sSink = sink

      const sourceDisposable = this.source.run(sink, scheduler);

      return {
        dispose: () => {
          sourceDisposable.dispose()

          this.bSink = []
          this.sSink = null
        }
      }
    }

    if (sink instanceof TetherSink) {
      this.bSink.push(sink)

      if (this.sSink?.hasValue) {
        sink.event(scheduler.currentTime(), this.sSink.value)
      }

      return disposeWith(
        s => {
          const sinkIdx = this.bSink.indexOf(s)

          if (sinkIdx > -1) {
            this.bSink[sinkIdx].end(scheduler.currentTime())
            remove(sinkIdx, this.bSink)
          }
        },
        sink
      )
    }

    throw new Error(`Sink is not an instance of ${SourceSink.name} or ${TetherSink.name}`)
  }

}



export const tether = <A>(source: Stream<A>): [Stream<A>, Stream<A>] => {
  const sp = new Tether(source)

  return [
    {
      run(sink, scheduler) {
        return sp.run(new SourceSink(sp, sink), scheduler)
      }
    },
    {
      run(sink, scheduler) {
        return sp.run(new TetherSink(sp, sink), scheduler)
      }
    }
  ]
}



