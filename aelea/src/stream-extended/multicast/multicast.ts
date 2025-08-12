import { disposeNone, disposeWith, type IScheduler, type ISink, type IStream } from '../../stream/index.js'
import { tryEnd, tryError, tryEvent } from '../utils.js'

/**
 * multicast :: Stream a -> Stream a
 *
 * Returns a Stream equivalent to the original but which can be shared more
 * efficiently among multiple consumers.
 *
 * stream:             -a-b-c-d-e->
 * multicast(stream):  -a-b-c-d-e->
 * subscriber1:        -a-b-c-d-e->
 * subscriber2:            -c-d|
 * subscriber3:              -d-e->
 *
 * Multicast allows you to build up a stream of maps, filters, and other
 * transformations, and then share it efficiently with multiple observers.
 */
export const multicast = <T>(source: IStream<T>): IStream<T> => {
  if (source instanceof Multicast) return source
  return new Multicast(source)
}

/**
 * Multicast stream implementation that shares a single source subscription
 * among multiple observers
 */
class Multicast<T> implements IStream<T> {
  private readonly source: MulticastSource<T>

  constructor(source: IStream<T>) {
    this.source = new MulticastSource(source)
  }

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    return this.source.run(sink, scheduler)
  }
}

class MulticastSource<T> implements IStream<T>, ISink<T>, Disposable {
  private sinks: ISink<T>[] = []
  private disposable: Disposable = disposeNone

  constructor(readonly source: IStream<T>) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    const n = this.sinks.push(sink)

    if (n === 1) {
      this.disposable = this.source.run(this, scheduler)
    }

    return disposeWith(() => {
      const i = this.sinks.indexOf(sink)
      if (i > -1) {
        this.sinks.splice(i, 1)
        if (this.sinks.length === 0) {
          this[Symbol.dispose]()
        }
      }
    })
  }

  [Symbol.dispose](): void {
    const d = this.disposable
    this.disposable = disposeNone
    d[Symbol.dispose]()
  }

  // ISink implementation - receives events from source stream
  event(value: T): void {
    const sinks = this.sinks
    const len = sinks.length

    if (len === 1) {
      tryEvent(sinks[0], value)
      return
    }

    if (len === 2) {
      const s0 = sinks[0]
      const s1 = sinks[1]
      tryEvent(s0, value)
      // Check if s1 still exists (in case s0 unsubscribed s1 synchronously)
      if (this.sinks.length > 1 && this.sinks[1] === s1) {
        tryEvent(s1, value)
      }
      return
    }

    // Use a copy to handle synchronous unsubscription during event
    const sinksCopy = sinks.slice()
    for (const sink of sinksCopy) tryEvent(sink, value)
  }

  error(error: unknown): void {
    const sinks = this.sinks
    const len = sinks.length

    if (len === 0) return

    if (len === 1) {
      tryError(sinks[0], error)
      return
    }

    // For multiple sinks, use a copy
    const sinksCopy = sinks.slice()
    for (const sink of sinksCopy) tryError(sink, error)
  }

  end(): void {
    const sinks = this.sinks.slice()
    this.sinks.length = 0

    for (const sink of sinks) tryEnd(sink)

    this[Symbol.dispose]()
  }
}
