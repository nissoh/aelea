import { stream } from '../stream.js'
import type { ISink, IStream } from '../types.js'
import { curry2 } from '../utils/function.js'
import { PipeSink } from '../utils/sink.js'

export interface IFilterCurry {
  <T, S extends T>(f: (value: T) => value is S, s: IStream<T>): IStream<S>
  <T>(f: (value: T) => boolean, s: IStream<T>): IStream<T>
  <T, S extends T>(f: (value: T) => value is S): (s: IStream<T>) => IStream<S>
  <T>(f: (value: T) => boolean): (s: IStream<T>) => IStream<T>
}

/**
 * Keep only values that pass a predicate test
 * 
 * stream:            -1-2-3-4-5-6->
 * filter(x => x%2):  ---2---4---6->
 */
export const filter: IFilterCurry = curry2((f: (value: any) => boolean, s: IStream<any>) =>
  stream((scheduler, sink) => s.run(scheduler, new FilterSink(f, sink)))
) as IFilterCurry

class FilterSink<T> extends PipeSink<T> {
  constructor(
    public readonly predicateFn: (value: T) => boolean,
    sink: ISink<T>
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

export const filterNull = <T>(prov: IStream<T | null>): IStream<T> => filter((ev): ev is T => ev !== null, prov)
