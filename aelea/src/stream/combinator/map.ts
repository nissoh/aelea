import type { IScheduler, ISink, IStream } from '../types.js'
import { compose, curry2 } from '../utils/function.js'
import { PipeSink } from '../utils/sink.js'

class MapSource<T, R> implements IStream<R> {
  constructor(
    readonly f: (value: T) => R,
    readonly source: IStream<T>
  ) {}

  run(sink: ISink<R>, scheduler: IScheduler) {
    return this.source.run(new MapSink(this.f, sink), scheduler)
  }
}

/**
 * Transform each value in a stream with a function
 *
 * stream:        -1-2-3-4->
 * map(x => x*2): -2-4-6-8->
 */
export const map: IMapCurry = curry2((f, source) => {
  if (source instanceof MapSource) {
    return new MapSource(compose(source.f, f), source.source)
  }

  return new MapSource(f, source)
})

class MapSink<I, O> extends PipeSink<I, O> {
  constructor(
    readonly f: (value: I) => O,
    sink: ISink<O>
  ) {
    super(sink)
  }

  event(value: I) {
    eventTryMap(this.sink, this.f, value)
  }
}

export function eventTryMap<In, Out>(sink: ISink<Out>, f: (value: In) => Out, value: In): void {
  try {
    const transformed = f(value)
    sink.event(transformed)
  } catch (error) {
    sink.error(error)
  }
}

export interface IMapCurry {
  <T, R>(f: (value: T) => R, source: IStream<T>): IStream<R>
  <T, R>(f: (value: T) => R): (source: IStream<T>) => IStream<R>
}
