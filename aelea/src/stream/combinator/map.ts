import { compose, curry2 } from '../function.js'
import { TransformSink } from '../sink.js'
import type { IStream, Sink } from '../types.js'

export interface IMapCurry {
  <T, R>(f: (value: T) => R, source: IStream<T>): IStream<R>
  <T, R>(f: (value: T) => R): <R>(source: IStream<T>) => IStream<R>
}

class MapSource<T, R> implements IStream<R> {
  constructor(
    readonly f: (value: T) => R,
    readonly source: IStream<T>
  ) {}

  run(scheduler: any, sink: Sink<R>) {
    return this.source.run(scheduler, new MapSink(this.f, sink))
  }
}

export const map: IMapCurry = curry2((f, source) => {
  if (source instanceof MapSource) {
    return new MapSource(compose(source.f, f), source.source)
  }

  return new MapSource(f, source)
})

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
