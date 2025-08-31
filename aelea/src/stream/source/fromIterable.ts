import { PropagateTask } from '../scheduler/PropagateTask.js'
import type { IScheduler, ISink, IStream, Time } from '../types.js'

/**
 * Creates a stream from any iterable (arrays, Sets, Maps, generators, etc.)
 *
 * fromIterable([1,2,3]):        123|
 * fromIterable(new Set([1,2])): 12|
 *
 * function* gen() { yield 'a'; yield 'b'; yield 'c' }
 * fromIterable(gen()):          abc|
 *
 * function* infinite() { let i = 0; while(true) yield i++ }
 * fromIterable(infinite()):     0123456789...->
 *                               (cancellable via dispose)
 */
export const fromIterable = <T>(iterable: Iterable<T>): IStream<T> => new FromIterable(iterable)

class FromIterable<T> implements IStream<T> {
  constructor(readonly iterable: Iterable<T>) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    return scheduler.asap(new EmitIterableTask(sink, this.iterable))
  }
}

class EmitIterableTask<T> extends PropagateTask<T> {
  constructor(
    sink: ISink<T>,
    readonly iterable: Iterable<T>
  ) {
    super(sink)
  }

  runIfActive(time: Time): void {
    try {
      for (const value of this.iterable) {
        if (!this.active) return
        this.sink.event(time, value)
      }
      this.sink.end(time)
    } catch (error) {
      // Generators can throw, custom iterators might fail
      this.sink.error(time, error)
    }
  }
}
