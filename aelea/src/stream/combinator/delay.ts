import { propagateEndTask, propagateRunEventTask } from '../scheduler/PropagateTask.js'
import type { IScheduler, ISink, IStream } from '../types.js'
import { disposeBoth } from '../utils/disposable.js'
import { curry2 } from '../utils/function.js'
import { PipeSink } from '../utils/sink.js'

/**
 * Delay each value by the specified time units
 *
 * stream:     -1-2-3->
 * delay(2):   ---1-2-3->
 */
class Delay<T> implements IStream<T> {
  constructor(
    readonly delayMs: number,
    readonly source: IStream<T>
  ) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    const disposableSink = new DelaySink(this.delayMs, sink, scheduler)
    return disposeBoth(this.source.run(disposableSink, scheduler), disposableSink)
  }
}

export const delay: IDelayCurry = curry2((n, source) => new Delay(n, source))

class DelaySink<T> extends PipeSink<T> implements Disposable {
  readonly disposableList: Disposable[] = []

  constructor(
    readonly n: number,
    override readonly sink: ISink<T>,
    readonly scheduler: IScheduler
  ) {
    super(sink)
  }

  event(value: T): void {
    this.disposableList.push(this.scheduler.delay(propagateRunEventTask(this.sink, emitDelay, value), this.n))
  }

  override end(): void {
    this.disposableList.push(this.scheduler.delay(propagateEndTask(this.sink), this.n))
  }

  [Symbol.dispose](): void {
    for (const d of this.disposableList.values()) d[Symbol.dispose]()
  }
}

function emitDelay<T>(sink: ISink<T>, value: T): void {
  sink.event(value)
}

export interface IDelayCurry {
  <T>(n: number, source: IStream<T>): IStream<T>
  <T>(n: number): (source: IStream<T>) => IStream<T>
}
