import { disposeWith, type IScheduler, type ISink, type IStream } from '../../stream/index.js'
import { append, remove, tryEnd, tryEvent } from '../utils.js'

/**
 * Generic multicast sink implementation that can be used by different multicast patterns
 * Manages multiple sinks with immutable array operations
 */
export abstract class MulticastSink<T> implements IStream<T>, ISink<T> {
  protected sinkList: readonly ISink<T>[] = []

  run(sink: ISink<T>, _: IScheduler): Disposable {
    this.sinkList = append(this.sinkList, sink)

    return disposeWith(() => {
      const i = this.sinkList.indexOf(sink)
      if (i > -1) {
        this.sinkList = remove(this.sinkList, i)
      }
    })
  }

  // ISink implementation - receives events to broadcast
  event(value: T): void {
    const sl = this.sinkList
    const l = sl.length

    if (l === 1) {
      tryEvent(sl[0], value)
      return
    }

    if (l === 2) {
      tryEvent(sl[0], value)
      tryEvent(sl[1], value)
      return
    }

    for (let i = 0; i < l; i++) {
      tryEvent(sl[i], value)
    }
  }

  error(error: Error): void {
    const sl = this.sinkList
    const l = sl.length

    if (l === 1) {
      sl[0].error(error)
      return
    }

    for (let i = 0; i < l; i++) {
      sl[i].error(error)
    }
  }

  end(): void {
    const sinks = this.sinkList
    this.sinkList = []

    const l = sinks.length
    for (let i = 0; i < l; i++) {
      tryEnd(sinks[i])
    }
  }
}
