import { curry2 } from '../function.js'
import { TransformSink, tryEvent } from '../sink.js'
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
    tryEvent(this.sink, this.f, value)
  }
}
