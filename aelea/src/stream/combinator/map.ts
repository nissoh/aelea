import { curry2 } from '../function.js'
import { TransformSink } from '../sink.js'
import type { IStream, Sink } from '../types.js'

export interface IMapCurry {
  <T, R>(f: (value: T) => R, source: IStream<T>): IStream<R>
  <T, R>(f: (value: T) => R): <R>(source: IStream<T>) => IStream<R>
}

export const map: IMapCurry = curry2((f, source) => ({
  run(scheduler, sink) {
    return source.run(scheduler, new MapSink(f, sink))
  }
}))

class MapSink<I, O> extends TransformSink<I, O> {
  constructor(
    readonly f: (value: I) => O,
    sink: Sink<O>
  ) {
    super(sink)
  }

  event(value: I) {
    eventTryMap(this.sink, this.f, value)
  }
}

export function eventTryMap<In, Out>(sink: Sink<Out>, f: (value: In) => Out, value: In): void {
  try {
    const transformed = f(value)
    sink.event(transformed)
  } catch (error) {
    sink.error(error)
  }
}
