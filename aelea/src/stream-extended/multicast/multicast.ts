import { disposeNone, disposeWith, type IScheduler, type ISink, type IStream } from '../../stream/index.js'
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

export class MulticastSource<T> extends MulticastSink<T> implements Disposable, IStream<T> {
  private disposable: Disposable = disposeNone

  constructor(readonly source: IStream<T>) {
    super()
  }

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    this.sinkList = append(this.sinkList, sink)

    if (this.sinkList.length === 1) {
      this.disposable = this.source.run(this, scheduler)
    }

    return disposeWith(() => {
      const i = this.sinkList.indexOf(sink)
      if (i > -1) {
        this.sinkList = remove(this.sinkList, i)
      }

      if (this.sinkList.length === 0) {
        this[Symbol.dispose]()
      }
    })
  }

  [Symbol.dispose](): void {
    const d = this.disposable
    this.disposable = disposeNone
    d[Symbol.dispose]()
  }

  end(): void {
    super.end()
    this[Symbol.dispose]()
  }
}
