import { empty, never } from '../source/void.js'
import type { IScheduler, ISink, IStream, ITime } from '../types.js'
import { disposeNone } from '../utils/disposable.js'
import { curry2 } from '../utils/function.js'
import { join } from './join.js'

/**
 * Take values until a signal stream emits
 *
 * stream: -a-b-c-d-e-f->
 * signal: -------x------>
 * until:  -a-b-c-|
 */
export const until: IUntilCurry = curry2((signal, source) => {
  if (signal === never || signal === empty) return source

  return new Until(signal, source)
})

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

class Until<A> implements IStream<A> {
  constructor(
    readonly signal: IStream<unknown>,
    readonly source: IStream<A>
  ) {}

  run(sink: ISink<A>, scheduler: IScheduler): Disposable {
    const untilSink = new UntilSink(sink)
    const source = this.source.run(untilSink, scheduler)
    if (untilSink.done) {
      source[Symbol.dispose]()
      return disposeNone
    }
    untilSink.source = source
    const signal = this.signal.run(new SignalSink(untilSink), scheduler)
    if (untilSink.done) {
      signal[Symbol.dispose]()
    } else {
      untilSink.signal = signal
    }
    return untilSink
  }
}

class UntilSink<A> implements ISink<A>, Disposable {
  done = false
  source: Disposable = disposeNone
  signal: Disposable = disposeNone

  constructor(readonly sink: ISink<A>) {}

  event(time: ITime, x: A): void {
    if (!this.done) this.sink.event(time, x)
  }

  error(time: ITime, e: unknown): void {
    if (!this.done) this.sink.error(time, e)
  }

  end(time: ITime): void {
    if (this.done) return
    this.done = true
    this.release()
    this.sink.end(time)
  }

  release(): void {
    const source = this.source
    const signal = this.signal
    this.source = disposeNone
    this.signal = disposeNone
    source[Symbol.dispose]()
    signal[Symbol.dispose]()
  }

  [Symbol.dispose](): void {
    this.done = true
    this.release()
  }
}

class SignalSink implements ISink<unknown> {
  constructor(readonly parent: UntilSink<unknown>) {}

  event(time: ITime): void {
    this.parent.end(time)
  }

  error(time: ITime, e: unknown): void {
    this.parent.error(time, e)
  }

  end(): void {}
}

class Since<A> implements IStream<A> {
  constructor(
    readonly signal: IStream<unknown>,
    readonly source: IStream<A>
  ) {}

  run(sink: ISink<A>, scheduler: IScheduler): Disposable {
    const sinceSink = new SinceSink(sink)
    const source = this.source.run(sinceSink, scheduler)
    if (sinceSink.done) {
      source[Symbol.dispose]()
      return disposeNone
    }
    sinceSink.source = source
    const signal = this.signal.run(new LowerBoundSink(sinceSink), scheduler)
    if (sinceSink.allow || sinceSink.done) {
      signal[Symbol.dispose]()
    } else {
      sinceSink.signal = signal
    }
    return sinceSink
  }
}

class SinceSink<A> implements ISink<A>, Disposable {
  allow = false
  done = false
  source: Disposable = disposeNone
  signal: Disposable = disposeNone

  constructor(readonly sink: ISink<A>) {}

  event(time: ITime, x: A): void {
    if (this.allow && !this.done) this.sink.event(time, x)
  }

  error(time: ITime, e: unknown): void {
    if (!this.done) this.sink.error(time, e)
  }

  end(time: ITime): void {
    if (this.done) return
    this.done = true
    this.releaseSignal()
    this.sink.end(time)
  }

  open(): void {
    if (this.done) return
    this.allow = true
    this.releaseSignal()
  }

  releaseSignal(): void {
    const signal = this.signal
    this.signal = disposeNone
    signal[Symbol.dispose]()
  }

  [Symbol.dispose](): void {
    this.done = true
    this.releaseSignal()
    const source = this.source
    this.source = disposeNone
    source[Symbol.dispose]()
  }
}

class LowerBoundSink implements ISink<unknown> {
  constructor(readonly parent: SinceSink<unknown>) {}

  event(): void {
    this.parent.open()
  }

  error(time: ITime, e: unknown): void {
    this.parent.error(time, e)
  }

  end(): void {}
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
