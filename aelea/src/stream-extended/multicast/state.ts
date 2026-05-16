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
  <T>(initialState: undefined, source: IStream<T>): IStream<T>
  <T>(initialState: T, source: IStream<T>): IStream<T>
  <T>(initialState: T): (source: IStream<T>) => IStream<T>
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
    // Subscribe to source with StateSink to capture future values
    const sourceDisposable = this.source.run(new StateSink(this, sink), scheduler)

    // If we have a cached value, emit it asynchronously
    const latestValue = this.latestValue
    if (latestValue !== undefined) {
      const cachedDisposable = scheduler.asap(propagateRunEventTask(sink, emitState, latestValue.value))
      return disposeBoth(cachedDisposable, sourceDisposable)
    }

    return sourceDisposable
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

function emitState<A>(time: ITime, sink: ISink<A>, value: A): void {
  sink.event(time, value)
}
