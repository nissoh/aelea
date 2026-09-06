import {
  disposeAll,
  disposeBoth,
  disposeWith,
  type IScheduler,
  type ISink,
  type IStream,
  type ITime,
  propagateEndTask,
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
 * Key behaviors:
 * - Primary stream: Unicast (each subscriber gets independent source subscription)
 * - Tether stream: Multicast that aggregates events from ALL primary subscriptions
 * - Tether ends when the last live primary ends; disposal of a primary is
 *   cancellation, not completion
 * - Once ended the tether is closed: late subscribers receive end
 *
 * @returns [primary, tethered] stream tuple
 */
export const tether = <T>(source: IStream<T>): [IStream<T>, IStream<T>] => {
  const tetherStream = new Tether<T>()
  return [new Primary(source, tetherStream), tetherStream]
}

function emitCachedValue<T>(time: ITime, sink: ISink<T>, primarySink: PrimarySink<T>): void {
  const latestValue = primarySink.latestValue
  if (latestValue !== undefined) {
    sink.event(time, latestValue.value)
  }
}

class PrimarySink<T> implements ISink<T> {
  latestValue?: { value: T }
  dead = false

  constructor(
    readonly primarySink: ISink<T>,
    readonly tether: Tether<T>
  ) {
    tether.liveContributors++
  }

  event(time: ITime, value: T): void {
    if (this.dead) return
    this.primarySink.event(time, value)

    if (this.latestValue) {
      this.latestValue.value = value
    } else {
      this.latestValue = { value }
    }

    this.tether.event(time, value)
  }

  end(time: ITime): void {
    if (this.dead) return
    this.primarySink.end(time)
    this.detach()
    if (this.tether.liveContributors === 0) this.tether.end(time)
  }

  error(time: ITime, err: unknown): void {
    if (this.dead) return
    this.primarySink.error(time, err)
    this.tether.error(time, err)
  }

  detach(): void {
    if (this.dead) return
    this.dead = true
    this.latestValue = undefined
    this.tether.liveContributors--
    const index = this.tether.primarySinkList.indexOf(this)
    if (index > -1) {
      this.tether.primarySinkList = remove(this.tether.primarySinkList, index)
    }
  }
}

class Primary<T> implements IStream<T> {
  constructor(
    readonly source: IStream<T>,
    readonly tether: Tether<T>
  ) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    const primarySink = new PrimarySink(sink, this.tether)
    this.tether.primarySinkList = append(this.tether.primarySinkList, primarySink)
    let sourceDisposable: Disposable
    try {
      sourceDisposable = this.source.run(primarySink, scheduler)
    } catch (err) {
      primarySink.detach()
      throw err
    }

    return disposeBoth(sourceDisposable, disposeWith(detach, primarySink))
  }
}

function detach<T>(primarySink: PrimarySink<T>): void {
  primarySink.detach()
}

class Tether<T> extends MulticastSink<T> implements IStream<T> {
  primarySinkList: readonly PrimarySink<T>[] = []
  liveContributors = 0
  closed = false

  override end(time: ITime): void {
    if (this.closed) return
    this.closed = true
    super.end(time)
  }

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    if (this.closed) return scheduler.asap(propagateEndTask(sink))

    this.sinkList = append(this.sinkList, sink)

    const disposables: Disposable[] = []

    for (const primarySink of this.primarySinkList) {
      if (primarySink.latestValue) {
        disposables.push(scheduler.asap(propagateRunEventTask(sink, emitCachedValue, primarySink)))
      }
    }

    disposables.push(
      disposeWith(() => {
        const i = this.sinkList.indexOf(sink)
        if (i > -1) this.sinkList = remove(this.sinkList, i)
      })
    )

    return disposeAll(disposables)
  }
}
