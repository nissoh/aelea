import type { IScheduler, ISink, IStream, Time } from '../types.js'
import { disposeBoth } from '../utils/disposable.js'
import { curry2 } from '../utils/function.js'
import { SettableDisposable } from '../utils/SettableDisposable.js'
import { PipeSink } from '../utils/sink.js'
import { join } from './join.js'

/**
 * Stream that takes values until a signal stream emits
 */
class Until<A> implements IStream<A> {
  constructor(
    readonly signal: IStream<unknown>,
    readonly source: IStream<A>
  ) {}

  run(sink: ISink<A>, scheduler: IScheduler): Disposable {
    const disposable = new SettableDisposable()

    const d1 = this.source.run(sink, scheduler)
    const d2 = this.signal.run(new UntilSink(sink, disposable), scheduler)
    disposable.set(disposeBoth(d1, d2))

    return disposable
  }
}

/**
 * Stream that takes values starting when a signal stream emits
 */
class Since<A> implements IStream<A> {
  constructor(
    readonly signal: IStream<unknown>,
    readonly source: IStream<A>
  ) {}

  run(sink: ISink<A>, scheduler: IScheduler): Disposable {
    const min = new LowerBoundSink(this.signal, sink, scheduler)
    const sourceDisposable = this.source.run(new SinceSink(min, sink), scheduler)

    return disposeBoth(min, sourceDisposable)
  }
}

/**
 * Take values until a signal stream emits
 *
 * stream: -a-b-c-d-e-f->
 * signal: -------x------>
 * until:  -a-b-c-|
 */
export const until: IUntilCurry = curry2((signal, source) => new Until(signal, source))

/**
 * Take values starting when a signal stream emits
 *
 * stream: -1-2-3-4-5-6->
 * signal: -------x------>
 * since:  -------4-5-6->
 */
export const since: ISinceCurry = curry2((signal, source) => new Since(signal, source))

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

  event(time: Time): void {
    this.disposable[Symbol.dispose]()
    this.sink.end(time)
  }

  error(time: Time, e: any): void {
    this.sink.error(time, e)
  }

  end(time: Time): void {
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

  event(time: Time, x: A): void {
    if (this.min.allow) {
      this.sink.event(time, x)
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

  event(time: Time): void {
    this.allow = true
    this[Symbol.dispose]()
  }

  error(time: Time, e: any): void {
    this.sink.error(time, e)
  }

  end(time: Time): void {
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
