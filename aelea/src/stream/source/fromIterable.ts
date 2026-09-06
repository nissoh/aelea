import { PropagateTask } from '../scheduler/PropagateTask.js'
import type { IScheduler, ISink, IStream, ITime } from '../types.js'

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
 *
 * A consumer that throws on one value is reported and delivery resumes with
 * the next. An iterator that throws cannot produce further values: the
 * stream fails with error then end.
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

  runIfActive(time: ITime): void {
    if (Array.isArray(this.iterable)) {
      this.emitArray(time, this.iterable)
    } else {
      this.emitIterator(time, this.iterable[Symbol.iterator]())
    }
  }

  emitArray(time: ITime, array: readonly T[]): void {
    const sink = this.sink
    let i = 0
    for (;;) {
      try {
        for (; i < array.length; i++) {
          sink.event(time, array[i])
          if (!this.active) return
        }
        sink.end(time)
        return
      } catch (error) {
        i++
        sink.error(time, error)
      }
    }
  }

  emitIterator(time: ITime, iterator: Iterator<T>): void {
    const sink = this.sink
    let stepping = false
    for (;;) {
      try {
        for (;;) {
          stepping = true
          const result = iterator.next()
          stepping = false
          if (result.done) break
          sink.event(time, result.value)
          if (!this.active) {
            iterator.return?.()
            return
          }
        }
        sink.end(time)
        return
      } catch (error) {
        if (stepping) {
          sink.error(time, error)
          sink.end(time)
          return
        }
        sink.error(time, error)
      }
    }
  }
}
