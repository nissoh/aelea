import { stream } from '../stream.js'
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
export const delay: IDelayCurry = curry2((n, source) =>
  stream((sink, scheduler) => {
    const disposableSink = new DelaySink(n, sink, scheduler)

    return disposeBoth(source.run(disposableSink, scheduler), disposableSink)
  })
)

class DelaySink<T> extends PipeSink<T> implements Disposable {
  private readonly disposableList: Disposable[] = []

  constructor(
    readonly n: number,
    override readonly sink: ISink<T>,
    readonly scheduler: IScheduler
  ) {
    super(sink)
  }

  event(value: T): void {
    this.disposableList.push(this.scheduler.delay(emitDelay, this.n, this.sink, value))
  }

  override end(): void {
    this.disposableList.push(this.scheduler.delay(emitEnd, this.n, this.sink))
  }

  [Symbol.dispose](): void {
    for (const d of this.disposableList.values()) d[Symbol.dispose]()
  }
}

function emitDelay<T>(sink: ISink<T>, value: T): void {
  sink.event(value)
}

function emitEnd<T>(sink: ISink<T>): void {
  sink.end()
}

export interface IDelayCurry {
  <T>(n: number, source: IStream<T>): IStream<T>
  <T>(n: number): (source: IStream<T>) => IStream<T>
}
