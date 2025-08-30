import type { IScheduler, ISink, IStream } from '../types.js'
import { curry2 } from '../utils/function.js'
import { PipeSink } from '../utils/sink.js'

/**
 * Stream that skips consecutive values that are equal according to provided function
 */
class SkipRepeatsWith<T> implements IStream<T> {
  constructor(
    readonly equals: (a: T, b: T) => boolean,
    readonly source: IStream<T>
  ) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    return this.source.run(new SkipRepeatsSink(this.equals, sink), scheduler)
  }
}

/**
 * Skip consecutive duplicate values, a === b strict equality
 *
 * stream:      -1-1-2-2-2-3-1-1->
 * skipRepeats: -1---2-----3-1--->
 */
export const skipRepeats = <T>(stream: IStream<T>): IStream<T> => skipRepeatsWith<T>((a, b) => a === b)(stream)

/**
 * Skip consecutive values that are equal according to provided function
 *
 * stream:             -A-A-B-B-C->
 * skipRepeatsWith(f): -A---B---C->
 *   where A = {a:1}
 *         B = {a:2}
 *         C = {a:3}
 */
export const skipRepeatsWith: ISkipRepeatsWithCurry = curry2((equals, source) => new SkipRepeatsWith(equals, source))

export interface ISkipRepeatsWithCurry {
  <T>(equals: (a: T, b: T) => boolean, source: IStream<T>): IStream<T>
  <T>(equals: (a: T, b: T) => boolean): (source: IStream<T>) => IStream<T>
}

class SkipRepeatsSink<T> extends PipeSink<T> {
  hasValue = false
  previousValue!: T

  constructor(
    readonly equals: (a: T, b: T) => boolean,
    sink: ISink<T>
  ) {
    super(sink)
  }

  event(time: number, value: T) {
    let shouldEmit = false

    if (!this.hasValue) {
      shouldEmit = true
    } else {
      try {
        shouldEmit = !this.equals(this.previousValue, value)
      } catch (error) {
        this.sink.error(time, error)
        return
      }
    }

    if (shouldEmit) {
      this.hasValue = true
      this.previousValue = value
      this.sink.event(time, value)
    }
  }
}
