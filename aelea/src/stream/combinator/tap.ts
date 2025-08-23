import type { IScheduler, ISink, IStream } from '../types.js'
import { curry2 } from '../utils/function.js'
import { PipeSink } from '../utils/sink.js'

/**
 * Perform side effects without changing stream values
 *
 * stream:           -1-2-3->
 * tap(console.log): -1-2-3->  (logs: 1, 2, 3)
 */
class Tap<T> implements IStream<T> {
  constructor(
    readonly f: (value: T) => unknown,
    readonly source: IStream<T>
  ) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    return this.source.run(new TapSink(this.f, sink), scheduler)
  }
}

export const tap: ITapCurry = curry2((f, source) => new Tap(f, source))
export interface ITapCurry {
  <T>(f: (value: T) => unknown, source: IStream<T>): IStream<T>
  <T>(f: (value: T) => unknown): (source: IStream<T>) => IStream<T>
}

class TapSink<T> extends PipeSink<T> {
  constructor(
    public readonly f: (value: T) => unknown,
    sink: ISink<T>
  ) {
    super(sink)
  }

  event(value: T) {
    try {
      this.f(value)
    } catch (error) {
      this.sink.error(error)
      return
    }
    this.sink.event(value)
  }
}
