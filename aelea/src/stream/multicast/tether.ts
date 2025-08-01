import { disposeNone, disposeWith } from '../disposable.js'
import type { IStream, Scheduler, Sink } from '../types.js'

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
export const tether = <T>(source: IStream<T>): [IStream<T>, IStream<T>] => {
  const tetherSource = new Tether(source)

  return [
    {
      run(scheduler, sink) {
        return tetherSource.run(scheduler, new SourceSink(tetherSource, sink))
      }
    },
    {
      run(scheduler, sink) {
        return tetherSource.run(scheduler, new TetherSink(sink))
      }
    }
  ]
}

interface StoredValue<T> {
  value: T
}

class SourceSink<T> implements Sink<T> {
  hasValue = false
  latestValue?: StoredValue<T>

  constructor(
    private readonly parent: Tether<T>,
    public readonly sink: Sink<T>
  ) {}

  event(x: T): void {
    this.latestValue = { value: x }
    this.hasValue = true

    this.sink.event(x)
    for (const s of this.parent.tetherSinkList) {
      s.event(x)
    }
  }

  end(): void {
    this.sink.end()
  }

  error(e: any): void {
    this.sink.error(e)
  }
}

class TetherSink<A> implements Sink<A> {
  constructor(public sink: Sink<A> | null) {}

  event(value: A): void {
    if (this.sink) {
      this.sink.event(value)
    }
  }

  end(): void {
    if (this.sink) {
      this.sink.end()
    }
    this.sink = null
  }

  error(err: any): void {
    if (this.sink) {
      this.sink.error(err)
    }
    // Don't throw - just log the error to avoid crashing
    console.error('TetherSink error with no active sink:', err)
  }
}

class Tether<T> implements IStream<T> {
  private readonly sourceSinkList: SourceSink<T>[] = []
  readonly tetherSinkList: TetherSink<T>[] = []

  private sourceDisposable: Disposable = disposeNone

  constructor(private readonly source: IStream<T>) {}

  run(scheduler: Scheduler, sink: Sink<T>): Disposable {
    if (sink instanceof SourceSink) {
      this.sourceDisposable[Symbol.dispose]()
      this.sourceSinkList.push(sink)

      this.sourceDisposable = this.source.run(scheduler, sink)

      return disposeWith(() => {
        const srcIdx = this.sourceSinkList.indexOf(sink)
        if (srcIdx > -1) {
          this.sourceSinkList.splice(srcIdx, 1)
          // Only dispose the source if this was the last sink
          if (this.sourceSinkList.length === 0) {
            this.sourceDisposable[Symbol.dispose]()
            this.sourceDisposable = disposeNone
          }
        }
      })
    }

    const tetherSink = sink as TetherSink<T>

    this.tetherSinkList.push(tetherSink)

    for (const s of this.sourceSinkList) {
      if (s.hasValue && s.latestValue) {
        tetherSink.event(s.latestValue.value)
      }
    }

    return disposeWith(() => {
      tetherSink.end()
      const sinkIdx = this.tetherSinkList.indexOf(tetherSink)

      if (sinkIdx > -1) {
        this.tetherSinkList.splice(sinkIdx, 1)
      }
    })
  }
}
