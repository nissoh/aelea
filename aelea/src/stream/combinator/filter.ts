import type { IScheduler, ISink, IStream, Time } from '../types.js'
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
class Filter<T> implements IStream<T> {
  constructor(
    readonly predicateFn: (value: T) => boolean,
    readonly source: IStream<T>
  ) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    return this.source.run(new FilterSink(this.predicateFn, sink), scheduler)
  }
}

export const filter: IFilterCurry = curry2(
  (f: (value: any) => boolean, s: IStream<any>) => new Filter(f, s)
) as IFilterCurry

class FilterSink<T> extends PipeSink<T> {
  constructor(
    public readonly predicateFn: (value: T) => boolean,
    sink: ISink<T>
  ) {
    super(sink)
  }

  event(time: Time, value: T) {
    try {
      if (this.predicateFn(value)) {
        this.sink.event(time, value)
      }
    } catch (error) {
      this.sink.error(time, error)
    }
  }
}

export const filterNull = <T>(prov: IStream<T | null>): IStream<T> => filter((ev): ev is T => ev !== null, prov)
