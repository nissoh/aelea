import { TransformSink } from '../sink.js'
import type { IStream, Sink } from '../types.js'

export function filter<T, E, S extends T>(f: (value: T) => value is S): (s: IStream<T, E>) => IStream<S, E>
export function filter<T, E>(f: (value: T) => boolean): (s: IStream<T, E>) => IStream<T, E>
export function filter<T, E>(f: (value: T) => boolean) {
  return (s: IStream<T, E>) => (env: E, sink: Sink<any>) => s(env, new FilterSink(f, sink))
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

export const filterNull = <T, S>(prov: IStream<T | null, S>) =>
  filter<T | null, S, T>((ev): ev is T => ev !== null)(prov)
