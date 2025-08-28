import type { IScheduler, ISink, IStream } from '../stream/types.js'
import { PipeSink } from '../stream/utils/sink.js'

/**
 * Spreads a stream of arrays into a stream of individual elements
 *
 * stream:       --[1,2,3]--[4]--[5,6]-->
 * spreadArray:  --1-2-3----4----5-6---->
 */
export function spreadArray<T>(source: IStream<T[]>): IStream<T> {
  return new SpreadArrayStream(source)
}

class SpreadArraySink<T> extends PipeSink<T[], T> {
  event(time: number, items: T[]): void {
    if (!Array.isArray(items)) {
      this.sink.error(time, new Error('spreadArray: source stream must emit arrays'))
      return
    }

    const len = items.length
    // Manual unrolling for common small arrays (micro-optimization)
    switch (len) {
      case 0:
        return
      case 1:
        this.sink.event(time, items[0])
        return
      case 2:
        this.sink.event(time, items[0])
        this.sink.event(time, items[1])
        return
      default:
        for (let i = 0; i < len; i++) {
          this.sink.event(time, items[i])
        }
    }
  }
}
export class SpreadArrayStream<T> implements IStream<T> {
  constructor(readonly source: IStream<T[]>) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    return this.source.run(new SpreadArraySink(sink), scheduler)
  }
}
