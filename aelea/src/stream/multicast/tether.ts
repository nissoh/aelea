import { stream } from '../stream.js'
import type { IScheduler, ISink, IStream } from '../types.js'
import { disposeNone, disposeWith } from '../utils/disposable.js'

/**
 * Creates a "tethered" pair of streams from a single source.
 *
 * The pattern creates a multicast topology:
 * ```
 *   source
 *     |
 *     v
 *   [s0] <-- Primary: controls source lifecycle
 *     |
 *     v
 *   [s1] <-- Tethered: receives all values from s0
 * ```
 *
 * Key behaviors:
 * - Only one primary sink (SourceSink) can be active at a time
 * - Multiple tethered sinks can listen simultaneously
 * - Tethered sinks receive the latest value immediately upon connection
 * - When primary ends, source is disposed
 *
 * @returns [primary, tethered] stream tuple
 */
export const tether = <T>(source: IStream<T>): [IStream<T>, IStream<T>] => {
  const tetherSource = new Tether(source)

  return [
    stream((sink, scheduler) => tetherSource.run(new SourceSink(tetherSource, sink), scheduler)),
    stream((sink, scheduler) => tetherSource.run(new TetherSink(sink), scheduler))
  ]
}

class SourceSink<T> implements ISink<T> {
  hasValue = false
  latestValue!: T

  constructor(
    private parent: Tether<T>,
    public sink: ISink<T>
  ) {}

  event(x: T): void {
    this.hasValue = true
    this.latestValue = x

    this.sink.event(x)
    for (const s of this.parent.tetherSinkList) {
      s.event(x)
    }
  }

  end() {
    this.sink.end()
  }

  error(e: Error): void {
    this.sink.error(e)
  }
}

class TetherSink<A> implements ISink<A> {
  constructor(public sink: ISink<A> | null) {}

  event(value: A): void {
    if (this.sink) {
      this.sink.event(value)
    }
  }

  end(): void {
    this.sink = null
  }

  error(err: Error): void {
    if (this.sink) {
      this.sink.error(err)
    }
  }
}

class Tether<T> implements IStream<T> {
  sourceSinkList: SourceSink<T>[] = []
  tetherSinkList: TetherSink<T>[] = []

  sourceDisposable: Disposable = disposeNone

  constructor(private source: IStream<T>) {}

  run(sink: SourceSink<T> | TetherSink<T>, scheduler: IScheduler): Disposable {
    if (sink instanceof SourceSink) {
      this.sourceDisposable[Symbol.dispose]()
      this.sourceSinkList.push(sink)

      this.sourceDisposable = this.source.run(sink, scheduler)

      return {
        [Symbol.dispose]: () => {
          const srcIdx = this.sourceSinkList.indexOf(sink)
          this.sourceSinkList.splice(srcIdx, 1)
          this.sourceDisposable[Symbol.dispose]()
        }
      }
    }

    this.tetherSinkList.push(sink)

    for (const s of this.sourceSinkList) {
      if (s.hasValue) {
        sink.event(s.latestValue)
      }
    }

    return disposeWith(() => {
      sink.end()
      const sinkIdx = this.tetherSinkList.indexOf(sink)

      if (sinkIdx > -1) {
        // remove(sinkIdx, tetherSinkList)
        this.tetherSinkList.splice(sinkIdx, 1)
      }
    })
  }
}
