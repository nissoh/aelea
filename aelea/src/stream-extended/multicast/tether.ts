import {
  disposeBoth,
  disposeNone,
  disposeWith,
  type IScheduler,
  type ISink,
  type IStream,
  type ITime,
  propagateRunEventTask
} from '../../stream/index.js'
import { append, remove } from '../utils.js'
import { MulticastSink } from './sink.js'

/**
 * Creates a "tethered" pair of streams from a single source.
 *
 * The pattern creates a split topology where each primary subscription
 * creates its own TetherSink that forwards events to both destinations:
 *
 * ```
 * Source ──┬── TetherSink₁ ──┬──> Primary Sink₁
 *          │                 └──┐
 *          │                    │
 *          ├── TetherSink₂ ──┬──> Primary Sink₂
 *          │                 └──┤
 *          │                    │
 *          └── TetherSink₃ ──┬──> Primary Sink₃
 *                            └──┤
 *                               ↓
 *                        Tether Multicast
 *                         /    |    \
 *                        v     v     v
 *                     tether tether tether
 *                     sub₁   sub₂   sub₃
 * ```
 *
 * Example flow for event 'x':
 * - Primary subscription 1: Source → TetherSink₁ → Primary Sink₁ + Tether
 * - Primary subscription 2: Source → TetherSink₂ → Primary Sink₂ + Tether
 * - Tether sees 'x' twice (once from each primary subscription)
 *
 * Key behaviors:
 * - Primary stream: Unicast (each subscriber gets independent source subscription)
 * - Tether stream: Multicast that aggregates events from ALL primary subscriptions
 * - Each primary subscription creates its own TetherSink
 * - Tether receives events from every primary subscription (may see duplicates)
 *
 * @returns [primary, tethered] stream tuple
 */
export const tether = <T>(source: IStream<T>, replayLatest = false): [IStream<T>, IStream<T>] => {
  const tetherStream = new Tether<T>(replayLatest)
  return [new PrimaryStream(source, tetherStream), tetherStream]
}

function emitCachedValue<T>(time: ITime, sink: ISink<T>, value: T): void {
  sink.event(time, value)
}

class TetherSink<T> implements ISink<T> {
  constructor(
    readonly primarySink: ISink<T>,
    readonly tether: Tether<T>
  ) {}

  event(time: ITime, value: T): void {
    this.primarySink.event(time, value)
    this.tether.latestValue = value
    this.tether.hasValue = true
    this.tether.event(time, value)
  }

  end(time: ITime): void {
    this.primarySink.end(time)
    this.tether.end(time)
  }

  error(time: ITime, err: Error): void {
    this.primarySink.error(time, err)
    this.tether.error(time, err)
  }
}

class PrimaryStream<T> implements IStream<T> {
  constructor(
    readonly source: IStream<T>,
    readonly tether: Tether<T>
  ) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    // Each subscription gets its own TetherSink
    const tetherSink = new TetherSink(sink, this.tether)

    // Emit cached value if tether has one
    if (this.tether.hasValue) {
      const currentTime = scheduler.time()
      sink.event(currentTime, this.tether.latestValue!)
    }

    return this.source.run(tetherSink, scheduler)
  }
}

/**
 * A multicast stream that receives events from the TetherSink
 * Supports multiple subscribers without needing a source stream
 */
class Tether<T> extends MulticastSink<T> implements IStream<T> {
  latestValue: T | undefined
  hasValue = false

  constructor(readonly replayLatest: boolean) {
    super()
  }

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    this.sinkList = append(this.sinkList, sink)

    const unsubscribeDisposable = disposeWith(() => {
      const i = this.sinkList.indexOf(sink)

      if (i > -1) this.sinkList = remove(this.sinkList, i)
    })

    if (this.replayLatest) {
      // Emit cached value if available
      const asapDisposable = this.hasValue
        ? scheduler.asap(propagateRunEventTask(sink, emitCachedValue, this.latestValue!))
        : disposeNone

      return disposeBoth(asapDisposable, unsubscribeDisposable)
    }

    return unsubscribeDisposable
  }
}
