import { disposeNone, disposeWith } from '@most/disposable'
import { remove } from '@most/prelude'
import type { Disposable, Scheduler, Sink, Stream, Time } from '@most/types'

class SourceSink<T> implements Sink<T> {
  hasValue = false
  latestValue!: T

  constructor(
    private parent: Tether<T>,
    public sink: Sink<T>
  ) {}

  event(t: number, x: T): void {
    this.latestValue = x
    this.hasValue = true

    this.sink.event(t, x)
    for (const s of this.parent.tetherSinkList) {
      s.event(t, x)
    }
  }

  end(t: Time) {
    this.sink.end(t)
  }

  error(t: Time, e: Error): void {
    this.sink.error(t, e)
  }
}

class TetherSink<A> implements Sink<A> {
  constructor(public sink: Sink<A> | null) {}

  event(time: number, value: A): void {
    if (this.sink) {
      this.sink.event(time, value)
    }
  }

  end(): void {
    this.sink = null
  }

  error(time: number, err: Error): void {
    if (this.sink) {
      this.sink.error(time, err)
    } else {
      throw new Error(err.message)
    }
  }
}

class Tether<T> implements Stream<T> {
  sourceSinkList: SourceSink<T>[] = []
  tetherSinkList: TetherSink<T>[] = []

  sourceDisposable: Disposable = disposeNone()

  constructor(private source: Stream<T>) {}

  run(sink: SourceSink<T> | TetherSink<T>, scheduler: Scheduler): Disposable {
    if (sink instanceof SourceSink) {
      this.sourceDisposable.dispose()
      this.sourceSinkList.push(sink)

      this.sourceDisposable = this.source.run(sink, scheduler)

      return {
        dispose: () => {
          const srcIdx = this.sourceSinkList.indexOf(sink)
          this.sourceSinkList.splice(srcIdx, 1)
          this.sourceDisposable.dispose()
        }
      }
    }

    this.tetherSinkList.push(sink)

    for (const s of this.sourceSinkList) {
      if (s.hasValue) {
        sink.event(scheduler.currentTime(), s.latestValue)
      }
    }

    return disposeWith(
      ([tetherSinkList, sourceTetherSink]) => {
        sourceTetherSink.end()
        const sinkIdx = tetherSinkList.indexOf(sourceTetherSink)

        if (sinkIdx > -1) {
          remove(sinkIdx, tetherSinkList)
        }
      },
      [this.tetherSinkList, sink] as const
    )
  }
}

export const tether = <T>(source: Stream<T>): [Stream<T>, Stream<T>] => {
  const tetherSource = new Tether(source)

  return [
    {
      run(sink, scheduler) {
        return tetherSource.run(new SourceSink(tetherSource, sink), scheduler)
      }
    },
    {
      run(sink, scheduler) {
        return tetherSource.run(new TetherSink(sink), scheduler)
      }
    }
  ]
}
