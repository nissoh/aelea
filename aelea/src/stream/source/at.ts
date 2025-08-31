import { propagateEndTask, propagateRunEventTask } from '../scheduler/PropagateTask.js'
import type { IScheduler, ISink, IStream, Time } from '../types.js'

/**
 * Emits a single value at a specific time, then ends
 * Skips emission if target time has already passed
 *
 * at(3, 'a'):   ---a|
 * at(0, 'b'):   b|        (emits immediately if current time is 0)
 * at(5, 'c'):   -----c|
 */
export const at = <T>(time: Time, value: T): IStream<T> => new At(time, value)

/**
 * Computes and emits a value at a specific time using function f, then ends
 * Skips emission if target time has already passed
 *
 * atWith(3, t => t):      ---3|
 * atWith(0, t => t*2):    0|        (emits immediately if current time is 0)
 * atWith(5, t => `${t}`): -----"5"|
 */
export const atWith = <T>(time: Time, f: (time: Time) => T): IStream<T> => new AtWith(time, f)

/**
 * Stream that emits a single value at a specific absolute time
 *
 * Case 1: Future time (time > current)
 * at(5, 'x') when current=2:  ---x|  (delays 3 units)
 *
 * Case 2: Past time (time <= current)
 * at(2, 'x') when current=5:  |      (ends immediately, no emission)
 */
class At<T> implements IStream<T> {
  constructor(
    readonly time: Time,
    readonly value: T
  ) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    // Calculate relative delay from current scheduler time
    const time = scheduler.time()
    const delay = Math.max(0, this.time - time)

    // Future time: schedule delayed emission then end
    // Past/current time: skip emission, just end stream
    return delay > 0
      ? scheduler.delay(propagateRunEventTask(sink, emit, this.value), delay)
      : scheduler.asap(propagateEndTask(sink))
  }
}

function emit<T>(time: Time, sink: ISink<T>, value: T) {
  sink.event(time, value)
  sink.end(time)
}

/**
 * Stream that computes and emits a value at a specific absolute time
 *
 * Case 1: Future time (time > current)
 * atWith(5, t => t) when current=2:  ---5|  (delays 3 units)
 *
 * Case 2: Past time (time <= current)
 * atWith(2, t => t) when current=5:  |      (ends immediately, no emission)
 */
class AtWith<T> implements IStream<T> {
  constructor(
    readonly time: Time,
    readonly f: (time: Time) => T
  ) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    // Calculate relative delay from current scheduler time
    const time = scheduler.time()
    const delay = Math.max(0, this.time - time)

    // Future time: schedule delayed emission then end
    // Past/current time: skip emission, just end stream
    return delay > 0
      ? scheduler.delay(propagateRunEventTask(sink, emitWith, this.f), delay)
      : scheduler.asap(propagateEndTask(sink))
  }
}

function emitWith<T>(time: Time, sink: ISink<T>, f: (time: Time) => T) {
  try {
    sink.event(time, f(time))
  } catch (e) {
    sink.error(time, e)
  }
  sink.end(time)
}
