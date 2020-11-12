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
    this.parent.tetherSink.forEach(s => s.event(t, x))
  }

  end(t: Time) {
    this.sink.end(t)
  }

  error(t: Time, e: Error): void {
    this.sink.error(t, e)
  }

}

class TetherSink<A> extends Pipe<A, A> {

  constructor(sink: Sink<A>) {
    super(sink)
  }

  event(t: number, x: A): void {
    this.sink.event(t, x)
  }

}



export class Tether<A> implements Stream<A> {

  sourceSink: SourceSink<A> | null = null;
  tetherSink: TetherSink<A>[] = [];

  constructor(private source: Stream<A>) { }

  run(sink: SourceSink<A> | TetherSink<A>, scheduler: Scheduler): Disposable {

    if (sink instanceof SourceSink) {

      if (this.sourceSink) {
        throw new Error('Cannot split multiple sources')
      }

      this.sourceSink = sink

      const sourceDisposable = this.source.run(sink, scheduler);

      return {
        dispose: () => {
          sourceDisposable.dispose()

          this.tetherSink = []
          this.sourceSink = null
        }
      }
    }

    if (sink instanceof TetherSink) {
      this.tetherSink.push(sink)

      if (this.sourceSink?.hasValue) {
        sink.event(scheduler.currentTime(), this.sourceSink.value)
      }

      return disposeWith(
        s => {
          const sinkIdx = this.tetherSink.indexOf(s)

          if (sinkIdx > -1) {
            this.tetherSink[sinkIdx].end(scheduler.currentTime())
            remove(sinkIdx, this.tetherSink)
          }
        },
        sink
      )
    }

    throw new Error(`Sink is not an instance of ${SourceSink.name} or ${TetherSink.name}`)
  }

}



export const tether = <A>(source: Stream<A>): [Stream<A>, Stream<A>] => {
  const split = new Tether(source)

  return [
    {
      run(sink, scheduler) {
        return split.run(new SourceSink(split, sink), scheduler)
      }
    },
    {
      run(sink, scheduler) {
        return split.run(new TetherSink(sink), scheduler)
      }
    }
  ]
}



