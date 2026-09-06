import type { ISink, ITime } from '../../stream/index.js'
import { tryEnd, tryError, tryEvent } from '../../stream/index.js'

const NO_ERROR = Symbol('no-error')

/**
 * Fan-out over many downstream sinks. A subscriber that throws from any
 * channel has faulted on its own; the others still receive the delivery,
 * and the fault is reported out of band rather than fed back upstream.
 */
export abstract class MulticastSink<T> implements ISink<T> {
  protected sinkList: readonly ISink<T>[] = []
  private propagatingError: unknown = NO_ERROR

  event(time: ITime, value: T): void {
    const sl = this.sinkList
    const l = sl.length

    if (l === 1) {
      tryEvent(sl[0], time, value)
      return
    }

    if (l === 2) {
      tryEvent(sl[0], time, value)
      tryEvent(sl[1], time, value)
      return
    }

    for (let i = 0; i < l; i++) {
      tryEvent(sl[i], time, value)
    }
  }

  error(time: ITime, error: unknown): void {
    if (this.propagatingError === error) return

    const sl = this.sinkList
    const l = sl.length
    const outer = this.propagatingError
    this.propagatingError = error

    try {
      for (let i = 0; i < l; i++) {
        tryError(sl[i], time, error)
      }
    } finally {
      this.propagatingError = outer
    }
  }

  end(time: ITime): void {
    const sinks = this.sinkList
    this.sinkList = []

    const l = sinks.length
    for (let i = 0; i < l; i++) {
      tryEnd(sinks[i], time)
    }
  }
}

/**
 * Lawful fan-in over one downstream sink: each contributor is a sub-sink, and
 * `end` forwards only when the LAST live contributor ends — one completing
 * contributor no longer terminates a sink other contributors still feed.
 * Detaching (disposal) is cancellation, not completion: it decrements the
 * live count without ever forwarding `end`. Errors stay applicative and pass
 * straight through. After the fan-in has forwarded `end`, it is closed:
 * late contributors attach inert.
 */
export class FanInSink<T> {
  live = 0
  closed = false

  constructor(readonly sink: ISink<T>) {}

  attach(): FanInContributor<T> {
    return new FanInContributor(this)
  }
}

export class FanInContributor<T> implements ISink<T>, Disposable {
  private done = false

  constructor(readonly parent: FanInSink<T>) {
    parent.live++
  }

  event(time: ITime, value: T): void {
    if (this.done || this.parent.closed) return
    this.parent.sink.event(time, value)
  }

  error(time: ITime, error: unknown): void {
    if (this.done || this.parent.closed) return
    this.parent.sink.error(time, error)
  }

  end(time: ITime): void {
    if (this.done) return
    this.done = true
    if (--this.parent.live === 0 && !this.parent.closed) {
      this.parent.closed = true
      this.parent.sink.end(time)
    }
  }

  [Symbol.dispose](): void {
    if (this.done) return
    this.done = true
    this.parent.live--
  }
}
