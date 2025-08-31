import { propagateEndTask, propagateRunEventTask } from '../scheduler/PropagateTask.js'
import type { IScheduler, ISink, IStream, Time } from '../types.js'

/**
 * Emits a single value at a specific absolute time, then ends
 * Skips emission if the target time has already passed
 *
 * at(3, 'a') when current=1:  --a|   (waits 2 units)
 * at(3, 'a') when current=5:  |      (time passed, ends immediately)
 * at(0, 'b'):                 b|     (emits immediately)
 */
export const at = <T>(time: Time, value: T): IStream<T> => new At(time, value)

/**
 * Computes and emits a value at a specific absolute time, then ends
 * Skips emission if the target time has already passed
 *
 * atWith(3, t => t) when current=1:  --3|   (waits 2 units)
 * atWith(3, t => t) when current=5:  |      (time passed, ends immediately)
 * atWith(0, t => t*2):                0|     (emits immediately)
 */
export const atWith = <T>(time: Time, f: (time: Time) => T): IStream<T> => new AtWith(time, f)

class At<T> implements IStream<T> {
  constructor(
    readonly time: Time,
    readonly value: T
  ) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    const currentTime = scheduler.time()
    const delay = Math.max(0, this.time - currentTime)

    return delay > 0
      ? scheduler.delay(propagateRunEventTask(sink, emit, this.value), delay)
      : scheduler.asap(propagateEndTask(sink))
  }
}

class AtWith<T> implements IStream<T> {
  constructor(
    readonly time: Time,
    readonly f: (time: Time) => T
  ) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    const currentTime = scheduler.time()
    const delay = Math.max(0, this.time - currentTime)

    return delay > 0
      ? scheduler.delay(propagateRunEventTask(sink, emitWith, this.f), delay)
      : scheduler.asap(propagateEndTask(sink))
  }
}

function emit<T>(time: Time, sink: ISink<T>, value: T) {
  sink.event(time, value)
  sink.end(time)
}

function emitWith<T>(time: Time, sink: ISink<T>, f: (time: Time) => T) {
  try {
    sink.event(time, f(time))
  } catch (e) {
    sink.error(time, e)
  }
  sink.end(time)
}
