import { disposeNone } from '../disposable.js'
import type { IStream, Sink } from '../types.js'

/**
 * Creates a multicast stream that shares a single subscription among multiple consumers.
 * This is useful for expensive streams that shouldn't be run multiple times.
 *
 * Note: Multicast is most useful for hot/async streams. For cold/synchronous streams,
 * the stream may complete before additional subscribers can attach.
 *
 * @example
 * const expensive = multicast(
 *   op(
 *     periodic(1000, 1),
 *     scan((acc, x) => acc + x, 0),
 *     tap(x => console.log('Computing:', x))
 *   )
 * )
 *
 * // Both subscribers share the same computation
 * expensive(env, sink1)
 * expensive(env, sink2)
 */
export const multicast = <T>(source: IStream<T>): IStream<T> => new MulticastSource(source)

class MulticastSource<T> implements Sink<T> {
  private readonly source: IStream<T>
  private sinks: Sink<T>[] = []
  private disposable: Disposable = disposeNone
  private running = false

  constructor(source: IStream<T>) {
    this.source = source
  }

  run(scheduler: any, sink: Sink<T>): Disposable {
    this.add(sink)

    if (!this.running && this.sinks.length === 1) {
      this.running = true
      this.disposable = this.source.run(scheduler, this)
    }

    return new MulticastDisposable(this, sink)
  }

  add(sink: Sink<T>): number {
    this.sinks.push(sink)
    return this.sinks.length
  }

  remove(sink: Sink<T>): number {
    const index = this.sinks.indexOf(sink)
    if (index >= 0) {
      this.sinks.splice(index, 1)
    }
    return this.sinks.length
  }

  dispose(): void {
    const d = this.disposable
    this.disposable = disposeNone
    this.running = false
    d[Symbol.dispose]()
  }

  // Sink implementation - forwards to all subscribed sinks
  event(value: T): void {
    const sinks = this.sinks
    const len = sinks.length

    if (len === 1) {
      sinks[0].event(value)
      return
    }

    // Use a copy to handle synchronous unsubscription during event
    const sinksCopy = sinks.slice()
    for (let i = 0; i < len; i++) {
      try {
        sinksCopy[i].event(value)
      } catch (e) {
        // Report error but continue with others
        try {
          sinksCopy[i].error(e)
        } catch {} // Ignore errors in error handlers
      }
    }
  }

  error(error: any): void {
    const sinks = this.sinks.slice()
    this.sinks.length = 0
    for (const sink of sinks) {
      sink.error(error)
    }
    this.dispose()
  }

  end(): void {
    const sinks = this.sinks.slice()
    this.sinks.length = 0
    this.running = false
    for (const sink of sinks) {
      sink.end()
    }
    this.dispose()
  }
}

class MulticastDisposable<T> implements Disposable {
  constructor(
    private source: MulticastSource<T>,
    private sink: Sink<T>
  ) {}

  [Symbol.dispose](): void {
    if (this.source.remove(this.sink) === 0) {
      this.source.dispose()
    }
  }
}
