import {
  disposeAll,
  disposeBoth,
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
export const tether = <T>(source: IStream<T>): [IStream<T>, IStream<T>] => {
  const tetherStream = new Tether<T>()
  return [new Primary(source, tetherStream), tetherStream]
}

function emitCachedValue<T>(time: ITime, sink: ISink<T>, value: T): void {
  sink.event(time, value)
}

class PrimarySink<T> implements ISink<T> {
  latestValue?: { value: T }

  constructor(
    readonly primary: Primary<T>,
    readonly primarySink: ISink<T>,
    readonly tetherSink: Tether<T>
  ) {}

  event(time: ITime, value: T): void {
    this.primarySink.event(time, value)

    // Store latest value per-sink, not per-primary
    if (this.latestValue) {
      this.latestValue.value = value
    } else {
      this.latestValue = { value }
    }

    this.tetherSink.event(time, value)
  }

  end(time: ITime): void {
    this.primarySink.end(time)
    this.tetherSink.end(time)
  }

  error(time: ITime, err: Error): void {
    this.primarySink.error(time, err)
    this.tetherSink.error(time, err)
  }
}

class Primary<T> implements IStream<T> {
  constructor(
    readonly source: IStream<T>,
    readonly tether: Tether<T>
  ) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    // Each subscription gets its own PrimarySink
    const primarySink = new PrimarySink(this, sink, this.tether)
    const sourceDisposable = this.source.run(primarySink, scheduler)

    this.tether.primarySinkList = append(this.tether.primarySinkList, primarySink)

    return disposeBoth(
      sourceDisposable,
      disposeWith(() => {
        // Clear the sink's cached value
        primarySink.latestValue = undefined
        // Remove this primarySink from the tether's list to prevent memory leak
        const index = this.tether.primarySinkList.indexOf(primarySink)
        if (index > -1) {
          this.tether.primarySinkList = remove(this.tether.primarySinkList, index)
        }
      })
    )
  }
}

/**
 * A multicast stream that receives events from the TetherSink
 * Supports multiple subscribers without needing a source stream
 */
class Tether<T> extends MulticastSink<T> implements IStream<T> {
  primarySinkList: readonly PrimarySink<T>[] = []

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    this.sinkList = append(this.sinkList, sink)

    const initialPrimaryDisposableList: Disposable[] = []

    for (const primarySink of this.primarySinkList) {
      if (primarySink.latestValue) {
        const initialEventDisposable = scheduler.asap(
          propagateRunEventTask(sink, emitCachedValue, primarySink.latestValue.value)
        )
        initialPrimaryDisposableList.push(initialEventDisposable)
      }
    }

    const unsubscribeDisposable = disposeWith(() => {
      const i = this.sinkList.indexOf(sink)

      if (i > -1) this.sinkList = remove(this.sinkList, i)
    })

    return disposeAll([...initialPrimaryDisposableList, unsubscribeDisposable])
  }
}
