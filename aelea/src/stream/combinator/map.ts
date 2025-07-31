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

class MapSink<In, Out> extends TransformSink<In, Out> {
  constructor(
    readonly f: (value: In) => Out,
    sink: Sink<Out>
  ) {
    super(sink)
  }

  event(value: In) {
    try {
      this.sink.event(this.f(value))
    } catch (error) {
      this.sink.error(error)
    }
  }
}
