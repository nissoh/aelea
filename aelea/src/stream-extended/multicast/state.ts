import {
  disposeBoth,
  type IScheduler,
  type ISink,
  type IStream,
  type ITime,
  PipeSink,
  propagateRunEventTask
} from '../../stream/index.js'
import { multicast } from './multicast.js'

export interface IStateCurry {
  (initialState?: undefined): <T>(source: IStream<T>) => IStream<T>
  <I extends NonNullable<unknown> | null, T>(initialState: I, source: IStream<T>): IStream<T | I>
  <I>(initialState: I): <T>(source: IStream<T>) => IStream<T | I>
}

/**
 * Create a multicast stream that remembers its latest value
 *
 * Without initialState (undefined):
 * stream:        -1-2-3--->
 * subscriber1:   -1-2-3--->
 * subscriber2:      2-3--->
 *
 * With initialState (0):
 * stream:        -1-2-3--->
 * subscriber1:   01-2-3--->
 * subscriber2:    1-2-3--->
 *
 * Once the source has ended, a late subscriber receives the final value and
 * then end.
 */
export const state: IStateCurry = ((...args: unknown[]) => {
  if (args.length >= 2) {
    return new State(multicast(args[1] as IStream<unknown>), args[0])
  }
  const initial = args[0]
  return (source: IStream<unknown>) => new State(multicast(source), initial)
}) as IStateCurry

export class State<A> implements IStream<A> {
  latestValue?: { value: A }

  constructor(
    readonly source: IStream<A>,
    readonly initialState?: A
  ) {
    if (initialState !== undefined) {
      this.latestValue = { value: initialState }
    }
  }

  run(sink: ISink<A>, scheduler: IScheduler): Disposable {
    const latestValue = this.latestValue
    if (latestValue === undefined) {
      return this.source.run(new StateSink(this, sink), scheduler)
    }

    const replay = scheduler.asap(propagateRunEventTask(sink, emitState, latestValue))
    return disposeBoth(replay, this.source.run(new StateSink(this, sink), scheduler))
  }
}

class StateSink<A> extends PipeSink<A> {
  constructor(
    readonly parent: State<A>,
    sink: ISink<A>
  ) {
    super(sink)
  }

  event(time: ITime, x: A): void {
    if (this.parent.latestValue) {
      this.parent.latestValue.value = x
    } else {
      this.parent.latestValue = { value: x }
    }
    this.sink.event(time, x)
  }
}

function emitState<A>(time: ITime, sink: ISink<A>, latestValue: { value: A }): void {
  sink.event(time, latestValue.value)
}
