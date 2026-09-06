import type { ITime } from '../../stream/index.js'
import {
  disposeNone,
  disposeWith,
  type IScheduler,
  type ISink,
  type IStream,
  propagateEndTask
} from '../../stream/index.js'
import { append, remove } from '../utils.js'
import { MulticastSink } from './sink.js'

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
 * One shared run of the source. Disposal of the last subscriber cancels that
 * run and a later subscriber starts a fresh one; the source ending closes it
 * for good, and later subscribers receive end.
 */
export const multicast = <T>(source: IStream<T>): IStream<T> => {
  if (source instanceof Multicast) return source
  return new Multicast(source)
}

class Multicast<T> implements IStream<T> {
  readonly source: MulticastSource<T>

  constructor(source: IStream<T>) {
    this.source = new MulticastSource(source)
  }

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    return this.source.run(sink, scheduler)
  }
}

export class MulticastSource<T> extends MulticastSink<T> implements Disposable, IStream<T> {
  disposable: Disposable = disposeNone
  closed = false

  constructor(readonly source: IStream<T>) {
    super()
  }

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    if (this.closed) return scheduler.asap(propagateEndTask(sink))

    this.sinkList = append(this.sinkList, sink)

    if (this.sinkList.length === 1) {
      let d: Disposable
      try {
        d = this.source.run(this, scheduler)
      } catch (error) {
        this.remove(sink)
        throw error
      }
      if (this.closed) {
        d[Symbol.dispose]()
      } else {
        this.disposable = d
      }
    }

    return disposeWith(() => {
      this.remove(sink)
      if (this.sinkList.length === 0) this[Symbol.dispose]()
    })
  }

  remove(sink: ISink<T>): void {
    const i = this.sinkList.indexOf(sink)
    if (i > -1) this.sinkList = remove(this.sinkList, i)
  }

  [Symbol.dispose](): void {
    const d = this.disposable
    this.disposable = disposeNone
    d[Symbol.dispose]()
  }

  end(time: ITime): void {
    if (this.closed) return
    this.closed = true
    super.end(time)
    this[Symbol.dispose]()
  }
}
