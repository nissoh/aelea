import {
  disposeNone,
  disposeWith,
  type IScheduler,
  type ISink,
  type IStream,
  propagateRunEventTask,
  stream
} from '../../stream/index.js'
import { tryError, tryEvent } from '../utils.js'

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
    readonly parent: Tether<T>,
    public sink: ISink<T>
  ) {}

  event(x: T): void {
    this.hasValue = true
    this.latestValue = x

    // Send to primary sink with error isolation
    tryEvent(this.sink, x)

    const sinkList = this.parent.tetherSinkList.slice()

    // Broadcast to tethered sinks with error isolation
    for (const s of sinkList) tryEvent(s, x)
  }

  end() {
    this.sink.end()
  }

  error(e: Error): void {
    // Send error to primary sink
    tryError(this.sink, e)

    const sinkList = this.parent.tetherSinkList.slice()
    // Propagate error to tethered sinks
    for (const s of sinkList) tryError(s, e)
  }
}

class TetherSink<A> implements ISink<A> {
  constructor(public readonly sink: ISink<A>) {}

  event(value: A): void {
    this.sink.event(value)
  }

  end(): void {
    // Don't end the wrapped sink - tethered streams continue
  }

  error(err: Error): void {
    this.sink.error(err)
  }
}

class Tether<T> implements IStream<T> {
  sourceSinkList: SourceSink<T>[] = []
  tetherSinkList: TetherSink<T>[] = []

  sourceDisposable: Disposable = disposeNone

  constructor(readonly source: IStream<T>) {}

  run(sink: SourceSink<T> | TetherSink<T>, scheduler: IScheduler): Disposable {
    if (sink instanceof SourceSink) {
      // Dispose previous source and clear old sinks
      this.sourceDisposable[Symbol.dispose]()
      this.sourceSinkList = [sink] // Only keep current sink

      this.sourceDisposable = this.source.run(sink, scheduler)

      return disposeWith(() => {
        const srcIdx = this.sourceSinkList.indexOf(sink)
        if (srcIdx > -1) {
          this.sourceSinkList.splice(srcIdx, 1)
        }
        // Only dispose source if this is the active sink
        if (this.sourceSinkList.length === 0) {
          this.sourceDisposable[Symbol.dispose]()
        }
      })
    }

    this.tetherSinkList.push(sink)

    // Send latest value asynchronously to prevent stack overflow
    const activeSource = this.sourceSinkList[0]
    let taskDisposable: Disposable = disposeNone

    if (activeSource?.hasValue && this.tetherSinkList.includes(sink as TetherSink<T>)) {
      // Use PropagateTask to handle disposal and active state properly
      taskDisposable = scheduler.asap(propagateRunEventTask(sink.sink, scheduler, emitLatestValue, activeSource))
    }

    return disposeWith(() => {
      taskDisposable[Symbol.dispose]()
      const sinkIdx = this.tetherSinkList.indexOf(sink)
      if (sinkIdx > -1) {
        this.tetherSinkList.splice(sinkIdx, 1)
      }
    })
  }
}

const emitLatestValue = <T>(sink: ISink<T>, source: SourceSink<T>) => {
  sink.event(source.latestValue)
}
