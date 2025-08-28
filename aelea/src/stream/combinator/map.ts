import type { IScheduler, ISink, IStream } from '../types.js'
import { compose, curry2 } from '../utils/function.js'
import { PipeSink } from '../utils/sink.js'

/**
 * Transform each value in a stream with a function
 */
class MapStream<T, R> implements IStream<R> {
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
  if (source instanceof MapStream) {
    return new MapStream(compose(source.f, f), source.source)
  }

  return new MapStream(f, source)
})

class MapSink<I, O> extends PipeSink<I, O> {
  constructor(
    readonly f: (value: I) => O,
    sink: ISink<O>
  ) {
    super(sink)
  }

  event(time: number, value: I) {
    eventTryMap(this.sink, time, this.f, value)
  }
}

export function eventTryMap<In, Out>(sink: ISink<Out>, time: number, f: (value: In) => Out, value: In): void {
  try {
    const transformed = f(value)
    sink.event(time, transformed)
  } catch (error) {
    sink.error(time, error)
  }
}

export interface IMapCurry {
  <T, R>(f: (value: T) => R, source: IStream<T>): IStream<R>
  <T, R>(f: (value: T) => R): (source: IStream<T>) => IStream<R>
}
