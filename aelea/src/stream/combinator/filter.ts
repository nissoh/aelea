import { curry2 } from '../function.js'
import { PipeSink } from '../sink.js'
import type { IStream, Sink } from '../types.js'

export interface IFilterCurry {
  // <T, S extends T>(f: (value: T) => value is S, s: IStream<T>): IStream<S>
  <T>(f: (value: T) => boolean, s: IStream<T>): IStream<T>
  // <T, S extends T>(f: (value: T) => value is S): (s: IStream<T>) => IStream<S>
  <T>(f: (value: T) => boolean): (s: IStream<T>) => IStream<T>
}

export const filter: IFilterCurry = curry2((f, s) => ({
  run(scheduler, sink) {
    return s.run(scheduler, new FilterSink(f, sink))
  }
}))

class FilterSink<T> extends PipeSink<T> {
  constructor(
    public readonly predicateFn: (value: T) => boolean,
    sink: Sink<T>
  ) {
    super(sink)
  }

  event(value: T) {
    try {
      if (this.predicateFn(value)) {
        this.sink.event(value)
      }
    } catch (error) {
      this.sink.error(error)
    }
  }
}

export const filterNull = <T>(prov: IStream<T | null>) => filter((ev): ev is T => ev !== null, prov)
