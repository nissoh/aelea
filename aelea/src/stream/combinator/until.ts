import type { IStream, Scheduler, Sink } from '../types.js'
import { disposeBoth } from '../utils/disposable.js'
import { curry2 } from '../utils/function.js'
import { SettableDisposable } from '../utils/SettableDisposable.js'
import { PipeSink } from '../utils/sink.js'
import { join } from './join.js'

export const until: IUntilCurry = curry2((signal, stream) => new Until(signal, stream))

export const since: ISinceCurry = curry2((signal, stream) => new Since(signal, stream))

export const during: IDuringCurry = curry2((timeWindow, stream) => {
  const untilJoined = until(join(timeWindow), stream)
  return since(timeWindow, untilJoined)
})

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

class Until<A> implements IStream<A> {
  constructor(
    private readonly maxSignal: IStream<unknown>,
    private readonly source: IStream<A>
  ) {}

  run(scheduler: Scheduler, sink: Sink<A>): Disposable {
    const disposable = new SettableDisposable()

    const d1 = this.source.run(scheduler, sink)
    const d2 = this.maxSignal.run(scheduler, new UntilSink(sink, disposable))
    disposable.set(disposeBoth(d1, d2))

    return disposable
  }
}

class UntilSink implements Sink<unknown> {
  constructor(
    private readonly sink: Sink<any>,
    private readonly disposable: Disposable
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

class Since<A> implements IStream<A> {
  constructor(
    private readonly minSignal: IStream<unknown>,
    private readonly source: IStream<A>
  ) {}

  run(scheduler: Scheduler, sink: Sink<A>): Disposable {
    const min = new LowerBoundSink(this.minSignal, sink, scheduler)
    const d = this.source.run(scheduler, new SinceSink(min, sink))

    return disposeBoth(min, d)
  }
}

class SinceSink<A> extends PipeSink<A> {
  constructor(
    private readonly min: LowerBoundSink<A>,
    sink: Sink<A>
  ) {
    super(sink)
  }

  event(x: A): void {
    if (this.min.allow) {
      this.sink.event(x)
    }
  }
}

class LowerBoundSink<A> implements Sink<unknown>, Disposable {
  allow = false
  private disposable: Disposable

  constructor(
    signal: IStream<unknown>,
    private readonly sink: Sink<A>,
    scheduler: Scheduler
  ) {
    this.disposable = signal.run(scheduler, this)
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
