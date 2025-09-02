import type { IScheduler, ISink, IStream, Time } from '../types.js'
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

  constructor(
    readonly n: number,
    sink: ISink<T>
  ) {
    super(sink)
  }

  event(time: Time, value: T) {
    if (this.taken < this.n) {
      this.taken++
      this.sink.event(time, value)

      if (this.taken === this.n) {
        this.end(time)
      }
    }
  }

  error(time: Time, error: any) {
    if (this.taken < this.n) {
      this.taken++
      this.sink.error(time, error)

      if (this.taken === this.n) {
        this.end(time)
      }
    }
  }
}
