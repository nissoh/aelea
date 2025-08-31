import {
  disposeBoth,
  type IScheduler,
  type ISink,
  type IStream,
  PipeSink,
  propagateRunEventTask,
  type Time
} from '../../stream/index.js'
import { multicast } from './multicast.js'

/**
 * Create a multicast stream that remembers its latest value
 *
 * Without initialState:
 * stream:        -1-2-3--->
 * subscriber1:   -1-2-3--->
 * subscriber2:      2-3--->
 *
 * With initialState (0):
 * stream:        -1-2-3--->
 * subscriber1:   01-2-3--->
 * subscriber2:    1-2-3--->
 */
export const state = <T>(source: IStream<T>, initialState?: T): IStream<T> =>
  new ReplayLatest(multicast(source), initialState)

class StateSink<A> extends PipeSink<A> {
  constructor(
    readonly parent: ReplayLatest<A>,
    sink: ISink<A>
  ) {
    super(sink)
  }

  event(time: Time, x: A): void {
    if (this.parent.latestValue === undefined) {
      this.parent.latestValue = { value: x }
    } else {
      this.parent.latestValue.value = x
    }
    this.sink.event(time, x)
  }
}

function emitState<A>(time: Time, sink: ISink<A>, value: A): void {
  sink.event(time, value)
}

export class ReplayLatest<A> implements IStream<A> {
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
    const boxedValue = this.latestValue
    if (boxedValue !== undefined) {
      const cachedDisposable = scheduler.asap(propagateRunEventTask(sink, emitState, boxedValue.value))
      return disposeBoth(cachedDisposable, sourceDisposable)
    }

    return sourceDisposable
  }
}
