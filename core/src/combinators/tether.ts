import { disposeNone, disposeWith } from '@most/disposable'
import { remove } from '@most/prelude'
import { Stream, Disposable, Scheduler, Sink, Time } from '@most/types'
import { Pipe } from '../utils'


class SourceSink<A> implements Sink<A> {
  hasValue = false;
  value!: A;

  constructor(private parent: Tether<A>, public sink: Sink<A>) { }

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

  constructor(public sink: Sink<A>) {
    super(sink)
  }

  event(t: number, x: A): void {
    this.sink.event(t, x)
  }

}



class Tether<A> implements Stream<A> {

  sourceSink: SourceSink<A> | null = null;
  sourceDisposable: Disposable = disposeNone();
  tetherSink: TetherSink<A>[] = [];

  constructor(private source: Stream<A>) { }

  run(sink: SourceSink<A> | TetherSink<A>, scheduler: Scheduler): Disposable {

    if (sink instanceof SourceSink) {
      if (this.sourceSink) {
        // this.dispose()
        throw new Error('tethering multiple sources is not allowed')
      }
      this.sourceSink = sink


      const disposable = this.source.run(sink, scheduler)
      this.sourceDisposable = disposable

      return {
        dispose: () => {
          const time = scheduler.currentTime()
          // this.tetherSink.forEach(s => s.end(time))
          // this.tetherSink.forEach(s => s.end(time))
          // this.tetherSink = []
          disposable.dispose()
        }
      }
    }


    this.tetherSink.push(sink)

    if (this.sourceSink?.hasValue) {
      sink.event(scheduler.currentTime(), this.sourceSink.value)
    }

    return disposeWith(
      ([tetherSinkList, sourceTetherSink]) => {
        sourceTetherSink.end(scheduler.currentTime())
        const sinkIdx = tetherSinkList.indexOf(sourceTetherSink)

        if (sinkIdx > -1) {
          remove(sinkIdx, tetherSinkList)
        }
      },
      [this.tetherSink, sink] as const
    )
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



