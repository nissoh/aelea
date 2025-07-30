import { disposeNone, disposeWith } from '@most/disposable'
import { remove } from '@most/prelude'
import type { Scheduler, Sink, Stream, Time } from '@most/types'

interface TimedValue<T> {
  time: Time
  value: T
}

class SourceSink<T> implements Sink<T> {
  hasValue = false
  latestValue?: TimedValue<T>

  constructor(
    private readonly parent: Tether<T>,
    public readonly sink: Sink<T>
  ) {}

  event(t: Time, x: T): void {
    this.latestValue = { time: t, value: x }
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

  event(time: Time, value: A): void {
    if (this.sink) {
      this.sink.event(time, value)
    }
  }

  end(time: Time): void {
    if (this.sink) {
      this.sink.end(time)
    }
    this.sink = null
  }

  error(time: Time, err: Error): void {
    if (this.sink) {
      this.sink.error(time, err)
    }
    // Don't throw - just log the error to avoid crashing
    console.error('TetherSink error with no active sink:', err)
  }
}

class Tether<T> implements Stream<T> {
  private readonly sourceSinkList: SourceSink<T>[] = []
  readonly tetherSinkList: TetherSink<T>[] = []

  private sourceDisposable: Disposable = disposeNone()

  constructor(private readonly source: IStream<T>) {}

  run(sink: SourceSink<T> | TetherSink<T>, scheduler: Scheduler): Disposable {
    if (sink instanceof SourceSink) {
      this.sourceDisposable.dispose()
      this.sourceSinkList.push(sink)

      this.sourceDisposable = this.source.run(sink, scheduler)

      return {
        dispose: () => {
          const srcIdx = this.sourceSinkList.indexOf(sink)
          if (srcIdx > -1) {
            this.sourceSinkList.splice(srcIdx, 1)
            // Only dispose the source if this was the last sink
            if (this.sourceSinkList.length === 0) {
              this.sourceDisposable.dispose()
              this.sourceDisposable = disposeNone()
            }
          }
        }
      }
    }

    this.tetherSinkList.push(sink)

    for (const s of this.sourceSinkList) {
      if (s.hasValue && s.latestValue) {
        // Use the actual event time, not current time
        sink.event(s.latestValue.time, s.latestValue.value)
      }
    }

    return disposeWith(
      ([tetherSinkList, sourceTetherSink, scheduler]) => {
        sourceTetherSink.end(scheduler.currentTime())
        const sinkIdx = tetherSinkList.indexOf(sourceTetherSink)

        if (sinkIdx > -1) {
          remove(sinkIdx, tetherSinkList)
        }
      },
      [this.tetherSinkList, sink, scheduler] as const
    )
  }
}

/**
 * Creates a pair of streams for multicasting with late subscriber support.
 *
 * @param source - The source stream to tether
 * @returns A tuple of [pushStream, pullStream] where:
 *   - pushStream: Multicasts values from source to all subscribers
 *   - pullStream: Receives the latest value when subscribed
 *
 * @example
 * const [push, pull] = tether(stream)
 * // push multicasts to all subscribers
 * // pull gets the latest value on subscription
 */
export const tether = <T>(source: IStream<T>): [Stream<T>, Stream<T>] => {
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
