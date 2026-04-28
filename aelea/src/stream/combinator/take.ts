import type { IScheduler, ISink, IStream, ITime } from '../types.js'
import { disposeNone } from '../utils/disposable.js'
import { curry2 } from '../utils/function.js'
import { PipeSink } from '../utils/sink.js'

/**
 * Stream that takes only the first n values from the source stream
 */
class Take<T> implements IStream<T> {
  constructor(
    readonly n: number,
    readonly source: IStream<T>
  ) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    const takeSink = new TakeSink(this.n, sink)
    const d = this.source.run(takeSink, scheduler)
    // If the source already satisfied the take synchronously in run(), dispose now.
    if (takeSink.done) {
      d[Symbol.dispose]()
      return disposeNone
    }
    takeSink.upstream = d
    return d
  }
}

/**
 * Take only the first n events (values or errors) from a stream
 *
 * stream:   -a-b-c-d-e-f->
 * take(3):  -a-b-c|
 *
 * stream:   -a-X-c-d->  (X = error)
 * take(3):  -a-X-c|
 */
export const take: ITakeCurry = curry2((n, source) => new Take(n, source))

export interface ITakeCurry {
  <T>(n: number, source: IStream<T>): IStream<T>
  <T>(n: number): (source: IStream<T>) => IStream<T>
}

class TakeSink<T> extends PipeSink<T> {
  taken = 0
  done = false
  upstream: Disposable = disposeNone

  constructor(
    readonly n: number,
    sink: ISink<T>
  ) {
    super(sink)
  }

  event(time: ITime, value: T) {
    if (this.done) return
    this.sink.event(time, value)
    this.taken++

    if (this.taken === this.n) this.finish(time)
  }

  error(time: ITime, error: unknown) {
    if (this.done) return
    this.sink.error(time, error)
    this.taken++

    if (this.taken === this.n) this.finish(time)
  }

  private finish(time: ITime): void {
    this.done = true
    this.sink.end(time)
    // upstream is disposeNone if finish happens during source's run() —
    // Take.run will dispose the returned handle itself.
    this.upstream[Symbol.dispose]()
    this.upstream = disposeNone
  }
}
