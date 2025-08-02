import { type IScheduler, type ISink, type IStream, map, switchLatest } from '../../stream/index.js'

/**
 * Creates a stream that emits on every animation frame using the scheduler
 */
function animationFrame<T>(value: T): IStream<T> {
  return {
    run(scheduler: IScheduler, sink: ISink<T>) {
      const disposable = scheduler.asap(sink, eventOnce, value)
      return disposable
    }
  }
}

function eventOnce<T>(sink: ISink<T>, value: T): void {
  sink.event(value)
  sink.end()
}

/**
 * Ensures a stream's latest value is emitted only once per animation frame.
 * Useful for optimizing updates to avoid multiple renders per frame.
 */
export const drawLatest = <A>(stream: IStream<A>): IStream<A> =>
  switchLatest(map((value: A) => animationFrame(value))(stream))
