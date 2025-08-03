import { startWith } from '../combinator/constant.js'
import type { IScheduler, ISink, IStream } from '../types.js'
import { PipeSink } from '../utils/sink.js'
import { multicast } from './multicast.js'

export const replayLatest = <A>(s: IStream<A>, initialState?: A): IStream<A> => new ReplayLatest(s, initialState)

export function replayState<T>(s: IStream<T>, initialState?: T): IStream<T> {
  return replayLatest(multicast(s), initialState)
}

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

  run(scheduler: IScheduler, sink: ISink<A>): Disposable {
    const stream = this.hasValue
      ? startWith(this.latestvalue)(this.source)
      : this.initialState !== undefined
        ? startWith(this.initialState)(this.source)
        : this.source

    return stream.run(scheduler, new StateSink(this, sink))
  }
}
