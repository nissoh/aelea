import {
  disposeNone,
  disposeWith,
  type IScheduler,
  type ISink,
  type IStream,
  propagateRunEventTask
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
 * - Multiple primary sinks can subscribe (multicast behavior)
 * - Multiple tethered sinks can listen simultaneously
 * - Tethered sinks receive the latest value immediately upon connection
 * - When all primary sinks dispose, source is disposed
 *
 * @returns [primary, tethered] stream tuple
 */
export const tether = <T>(source: IStream<T>): [IStream<T>, IStream<T>] => {
  const tetherSource = new Tether<T>()

  return [new Source(source, tetherSource), tetherSource]
}

class Source<T> implements IStream<T> {
  constructor(
    readonly source: IStream<T>,
    readonly tether: Tether<T>
  ) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    return this.tether.addSource(sink, this.source, scheduler)
  }
}

class MulticastSink<T> implements ISink<T> {
  hasValue = false
  latestValue!: T

  constructor(
    readonly sourceSinks: ISink<T>[],
    readonly tether: Tether<T>
  ) {}

  event(x: T): void {
    this.hasValue = true
    this.latestValue = x

    // Broadcast to all source sinks with error isolation
    for (const sink of this.sourceSinks) {
      tryEvent(sink, x)
    }

    // Broadcast to tethered sinks
    this.tether.broadcast(x)
  }

  end(): void {
    // End all source sinks
    for (const sink of this.sourceSinks) {
      sink.end()
    }
  }

  error(err: Error): void {
    // Send error to all source sinks
    for (const sink of this.sourceSinks) {
      tryError(sink, err)
    }

    // Broadcast error to tethered sinks
    this.tether.broadcastError(err)
  }
}

class Tether<T> implements IStream<T> {
  private tetherSinkList: ISink<T>[] = []
  private sourceSinks: ISink<T>[] = []
  private multicastSink: MulticastSink<T> | null = null
  private sourceDisposable: Disposable = disposeNone

  addSource(sink: ISink<T>, source: IStream<T>, scheduler: IScheduler): Disposable {
    const n = this.sourceSinks.push(sink)

    // Only subscribe to source on first sink
    if (n === 1) {
      this.multicastSink = new MulticastSink(this.sourceSinks, this)
      this.sourceDisposable = source.run(this.multicastSink, scheduler)
    }

    return disposeWith(() => {
      const idx = this.sourceSinks.indexOf(sink)
      if (idx > -1) {
        this.sourceSinks.splice(idx, 1)

        // If this was the last sink, dispose source
        if (this.sourceSinks.length === 0) {
          this.multicastSink = null
          this.sourceDisposable[Symbol.dispose]()
          this.sourceDisposable = disposeNone
        }
      }
    })
  }

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    this.tetherSinkList.push(sink)

    // Send latest value asynchronously if available
    let taskDisposable: Disposable = disposeNone
    if (this.multicastSink?.hasValue) {
      taskDisposable = scheduler.asap(propagateRunEventTask(sink, emitLatestValue, this.multicastSink))
    }

    return disposeWith(() => {
      taskDisposable[Symbol.dispose]()
      const sinkIdx = this.tetherSinkList.indexOf(sink)
      if (sinkIdx > -1) {
        this.tetherSinkList.splice(sinkIdx, 1)
      }
    })
  }

  broadcast(value: T): void {
    const sinkList = this.tetherSinkList.slice()
    // Broadcast to tethered sinks with error isolation
    for (const s of sinkList) tryEvent(s, value)
  }

  broadcastError(err: Error): void {
    const sinkList = this.tetherSinkList.slice()
    // Propagate error to tethered sinks
    for (const s of sinkList) tryError(s, err)
  }
}

const emitLatestValue = <T>(sink: ISink<T>, source: MulticastSink<T>) => {
  sink.event(source.latestValue)
}
