import { TransformSink } from '../sink.js'
import type { IStream, Sink } from '../types.js'

export function filter<T, S extends T>(f: (value: T) => value is S): (s: IStream<T>) => IStream<S>
export function filter<T>(f: (value: T) => boolean): (s: IStream<T>) => IStream<T>
export function filter<T>(f: (value: T) => boolean) {
  return (s: IStream<T>): IStream<T> => ({
    run(scheduler, sink) {
      return s.run(scheduler, new FilterSink(f, sink))
    }
  })
}

class FilterSink<T> extends TransformSink<T, T> {
  constructor(
    public readonly predicateFn: (value: T) => boolean,
    sink: Sink<T>
  ) {
    super(sink)
  }

  event(value: T) {
    this.tryEvent(() => {
      if (this.predicateFn(value)) {
        this.sink.event(value)
      }
    })
  }
}

export const filterNull = <T>(prov: IStream<T | null>) => filter<T | null, T>((ev): ev is T => ev !== null)(prov)
