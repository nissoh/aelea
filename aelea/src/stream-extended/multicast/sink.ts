import type { ISink } from '../../stream/index.js'
import { tryEnd, tryEvent } from '../utils.js'

/**
 * Generic multicast sink implementation that can be used by different multicast patterns
 * Manages multiple sinks with immutable array operations
 */
export abstract class MulticastSink<T> implements ISink<T> {
  protected sinkList: readonly ISink<T>[] = []

  // ISink implementation - receives events to broadcast
  event(time: number, value: T): void {
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

  error(time: number, error: Error): void {
    const sl = this.sinkList
    const l = sl.length

    if (l === 1) {
      sl[0].error(time, error)
      return
    }

    for (let i = 0; i < l; i++) {
      sl[i].error(time, error)
    }
  }

  end(time: number): void {
    const sinks = this.sinkList
    this.sinkList = []

    const l = sinks.length
    for (let i = 0; i < l; i++) {
      tryEnd(sinks[i], time)
    }
  }
}
