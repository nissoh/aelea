import { disposeNone } from '../core.js'
import type { Disposable, IStream, Sink } from '../types.js'

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
export const multicast = <T, S>(source: IStream<T, S>): IStream<T, S> => {
  const multicastSource = new MulticastSource(source)
  return (scheduler, sink) => multicastSource.run(scheduler, sink)
}

class MulticastSource<T, S> implements Sink<T> {
  private readonly source: IStream<T, S>
  private sinks: Sink<T>[] = []
  private disposable: Disposable = disposeNone
  private running = false

  constructor(source: IStream<T, S>) {
    this.source = source
  }

  run(scheduler: S, sink: Sink<T>): Disposable {
    if (this.running) {
      // Stream is already running, just add the sink
      this.add(sink)
    } else if (this.sinks.length === 0) {
      // First subscriber
      this.add(sink)
      this.running = true
      this.disposable = this.source(scheduler, this)
    } else {
      // Should not happen in normal usage
      this.add(sink)
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
    if (sinks.length === 1) {
      sinks[0].event(value)
      return
    }

    // Use a copy to handle synchronous unsubscription during event
    const sinksCopy = sinks.slice()
    for (let i = 0; i < sinksCopy.length; i++) {
      try {
        sinksCopy[i].event(value)
      } catch (e) {
        // If one sink errors, continue with others
        sinksCopy[i].error(e)
      }
    }
  }

  error(error: any): void {
    const sinks = this.sinks.slice()
    this.sinks = []
    for (let i = 0; i < sinks.length; i++) {
      sinks[i].error(error)
    }
    this.dispose()
  }

  end(): void {
    const sinks = this.sinks.slice()
    this.sinks = []
    this.running = false
    for (let i = 0; i < sinks.length; i++) {
      sinks[i].end()
    }
    this.dispose()
  }
}

class MulticastDisposable<T, S> implements Disposable {
  constructor(
    private source: MulticastSource<T, S>,
    private sink: Sink<T>
  ) {}

  [Symbol.dispose](): void {
    if (this.source.remove(this.sink) === 0) {
      this.source.dispose()
    }
  }
}
