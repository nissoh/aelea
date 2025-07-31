import { curry2 } from '../function.js'
import { TransformSink } from '../sink.js'
import type { IStream, Sink } from '../types.js'

export interface ITapCurry {
  <T>(f: (value: T) => unknown, source: IStream<T>): IStream<T>
  <T>(f: (value: T) => unknown): (source: IStream<T>) => IStream<T>
}

export const tap: ITapCurry = curry2((f, source) => ({
  run(scheduler, sink) {
    return source.run(scheduler, new TapSink(f, sink))
  }
}))

class TapSink<T> extends TransformSink<T, T> {
  constructor(
    public readonly f: (value: T) => unknown,
    sink: Sink<T>
  ) {
    super(sink)
  }

  event(value: T) {
    this.tryEvent(() => {
      this.f(value)
      this.sink.event(value)
    })
  }
}
