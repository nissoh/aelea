import type { IScheduler, ISink, IStream } from '../types.js'
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
    return this.source.run(new TakeSink(this.n, sink), scheduler)
  }
}

/**
 * Take only the first n values from a stream
 *
 * stream:   -1-2-3-4-5-6->
 * take(3):  -1-2-3-|
 */
export const take: ITakeCurry = curry2((n, source) => new Take(n, source))

export interface ITakeCurry {
  <T>(n: number, source: IStream<T>): IStream<T>
  <T>(n: number): (source: IStream<T>) => IStream<T>
}

class TakeSink<T> extends PipeSink<T> {
  taken = 0

  constructor(
    readonly n: number,
    sink: ISink<T>
  ) {
    super(sink)
  }

  event(time: number, value: T) {
    if (this.taken < this.n) {
      this.taken++
      this.sink.event(time, value)

      if (this.taken === this.n) {
        this.end(time)
      }
    }
  }
}
