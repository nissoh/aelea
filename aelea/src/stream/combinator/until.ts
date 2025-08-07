import { stream } from '../stream.js'
import type { IScheduler, ISink, IStream } from '../types.js'
import { disposeBoth } from '../utils/disposable.js'
import { curry2 } from '../utils/function.js'
import { SettableDisposable } from '../utils/SettableDisposable.js'
import { PipeSink } from '../utils/sink.js'
import { join } from './join.js'

/**
 * Take values until a signal stream emits
 *
 * stream: -1-2-3-4-5-6->
 * signal: -------x------>
 * until:  -1-2-3-|
 */
export const until: IUntilCurry = curry2((signal, source) =>
  stream((sink, scheduler) => {
    const disposable = new SettableDisposable()

    const d1 = source.run(sink, scheduler)
    const d2 = signal.run(new UntilSink(sink, disposable), scheduler)
    disposable.set(disposeBoth(d1, d2))

    return disposable
  })
)

/**
 * Take values starting when a signal stream emits
 *
 * stream: -1-2-3-4-5-6->
 * signal: -------x------>
 * since:  -------4-5-6->
 */
export const since: ISinceCurry = curry2((signal, source) =>
  stream((sink, scheduler) => {
    const min = new LowerBoundSink(signal, sink, scheduler)
    const sourceDisposable = source.run(new SinceSink(min, sink), scheduler)

    return disposeBoth(min, sourceDisposable)
  })
)

/**
 * Take values only during time windows
 *
 * stream:     -1-2-3-4-5-6-7-8->
 * timeWindow: ---[---]---[---]->
 * during:     ---2-3-----6-7--->
 */
export const during: IDuringCurry = curry2((timeWindow, stream) => {
  const untilJoined = until(join(timeWindow), stream)
  return since(timeWindow, untilJoined)
})

class UntilSink implements ISink<unknown> {
  constructor(
    readonly sink: ISink<any>,
    readonly disposable: Disposable
  ) {}

  event(): void {
    this.disposable[Symbol.dispose]()
    this.sink.end()
  }

  error(e: any): void {
    this.sink.error(e)
  }

  end(): void {
    // Don't end main stream if signal ends
  }
}

class SinceSink<A> extends PipeSink<A> {
  constructor(
    readonly min: LowerBoundSink<A>,
    sink: ISink<A>
  ) {
    super(sink)
  }

  event(x: A): void {
    if (this.min.allow) {
      this.sink.event(x)
    }
  }
}

class LowerBoundSink<A> implements ISink<unknown>, Disposable {
  allow = false
  disposable: Disposable

  constructor(
    signal: IStream<unknown>,
    readonly sink: ISink<A>,
    scheduler: IScheduler
  ) {
    this.disposable = signal.run(this, scheduler)
  }

  event(): void {
    this.allow = true
    this[Symbol.dispose]()
  }

  error(e: any): void {
    this.sink.error(e)
  }

  end(): void {
    // Don't propagate end from signal
  }

  [Symbol.dispose](): void {
    this.disposable[Symbol.dispose]()
  }
}

export interface IUntilCurry {
  <A>(signal: IStream<unknown>, stream: IStream<A>): IStream<A>
  <A>(signal: IStream<unknown>): (stream: IStream<A>) => IStream<A>
}

export interface ISinceCurry {
  <A>(signal: IStream<unknown>, stream: IStream<A>): IStream<A>
  <A>(signal: IStream<unknown>): (stream: IStream<A>) => IStream<A>
}

export interface IDuringCurry {
  <A>(timeWindow: IStream<IStream<unknown>>, stream: IStream<A>): IStream<A>
  <A>(timeWindow: IStream<IStream<unknown>>): (stream: IStream<A>) => IStream<A>
}
