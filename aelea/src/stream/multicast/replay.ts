import { startWith } from '../combinator/constant.js'
import type { IScheduler, ISink, IStream } from '../types.js'
import { PipeSink } from '../utils/sink.js'
import { multicast } from './multicast.js'

export interface IReplayLatestCurry {
  <A>(source: IStream<A>, initialState?: A): IStream<A>
  <A>(source: IStream<A>): (initialState?: A) => IStream<A>
}

export interface IReplayStateCurry {
  <T>(source: IStream<T>, initialState?: T): IStream<T>
  <T>(source: IStream<T>): (initialState?: T) => IStream<T>
}

/**
 * Remember the latest value from a stream
 *
 * stream:        -1-2-3--->
 * subscriber1:   ^1-2-3--->
 * subscriber2:     ^2-3--->
 * subscriber3:       ^3--->
 */
export const replayLatest = <A>(s: IStream<A>, initialState?: A): IStream<A> => new ReplayLatest(s, initialState)

/**
 * Create a multicast stream that remembers its latest value
 *
 * stream:        -1-2-3--->
 * replayState:   -1-2-3--->
 * subscriber1:   ^1-2-3--->
 * subscriber2:     ^2-3--->
 */
export const replayState = <T>(s: IStream<T>, initialState?: T): IStream<T> =>
  multicast(new ReplayLatest(s, initialState))

class StateSink<A> extends PipeSink<A> {
  constructor(
    private readonly parent: ReplayLatest<A>,
    sink: ISink<A>
  ) {
    super(sink)
  }

  event(x: A): void {
    this.parent.latestvalue = x
    this.parent.hasValue = true
    this.sink.event(x)
  }
}

export class ReplayLatest<A> implements IStream<A> {
  latestvalue!: A
  hasValue = false

  constructor(
    private readonly source: IStream<A>,
    private readonly initialState?: A
  ) {}

  run(sink: ISink<A>, scheduler: IScheduler): Disposable {
    const stream = this.hasValue
      ? startWith(this.latestvalue)(this.source)
      : this.initialState !== undefined
        ? startWith(this.initialState)(this.source)
        : this.source

    return stream.run(new StateSink(this, sink), scheduler)
  }
}
