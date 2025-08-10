import { disposeNone, disposeWith, type IScheduler, type ISink, type IStream } from '../../stream/index.js'

/**
 * Creates a multicast stream that shares a single source subscription among multiple subscribers.
 *
 * Error handling behavior:
 * - Sink errors (subscriber throws): Isolated to that subscriber, others continue receiving events
 * - Source errors (upstream failure): Propagated to all subscribers, stream continues running
 * - Only end() is a terminal signal that disposes the stream
 */
export const multicast = <T>(source: IStream<T>): IStream<T> => new MulticastSource(source)

class MulticastSource<T> implements IStream<T>, ISink<T>, Disposable {
  sinks: ISink<T>[] = []
  disposable: Disposable = disposeNone
  running = false

  constructor(readonly source: IStream<T>) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    this.sinks.push(sink)

    if (!this.running && this.sinks.length === 1) {
      this.running = true
      this.disposable = this.source.run(this, scheduler)
    }

    return disposeWith(() => {
      const index = this.sinks.indexOf(sink)
      if (index >= 0) {
        this.sinks.splice(index, 1)
      }

      if (this.sinks.length === 0) {
        this[Symbol.dispose]()
      }
    })
  }

  [Symbol.dispose](): void {
    const d = this.disposable
    this.disposable = disposeNone
    this.running = false
    d[Symbol.dispose]()
  }

  // ISink implementation - receives events from source stream
  event(value: T): void {
    const sinks = this.sinks
    const len = sinks.length

    if (len === 1) {
      sinks[0].event(value)
      return
    }

    if (len === 2) {
      sinks[0].event(value)
      sinks[1].event(value)

      return
    }

    // Use a copy to handle synchronous unsubscription during event
    const sinksCopy = sinks.slice()
    for (const sink of sinksCopy) sink.event(value)
  }

  error(error: any): void {
    // Propagate error to all sinks
    // Don't dispose - allow the stream to potentially recover
    const sinks = this.sinks.slice()
    for (const sink of sinks) sink.error(error)
  }

  end(): void {
    const sinks = this.sinks.slice()
    this.sinks.length = 0
    this.running = false
    for (const sink of sinks) sink.end()
    this[Symbol.dispose]()
  }
}
