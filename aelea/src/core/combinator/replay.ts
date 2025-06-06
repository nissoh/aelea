import { startWith } from '@most/core'
import type { Disposable, Scheduler, Sink, Stream } from '@most/types'
import { Pipe } from '../common.js'

class StateSink<A> extends Pipe<A, A> {
  constructor(
    private readonly parent: ReplayLatest<A>,
    public override sink: Sink<A>
  ) {
    super(sink)
  }

  event(t: number, x: A): void {
    this.parent.latestvalue = x
    this.parent.hasValue = true

    this.sink.event(t, x)
  }
}

export class ReplayLatest<A> implements Stream<A> {
  latestvalue!: A
  hasValue = false
  hasInitial
  constructor(
    private readonly source: Stream<A>,
    private readonly initialState?: A
  ) {
    this.hasInitial = initialState !== undefined
  }

  run(sink: Sink<A>, scheduler: Scheduler): Disposable {
    const startWithReplay = this.hasValue
      ? startWith(this.latestvalue)
      : this.hasInitial
        ? startWith(this.initialState)
        : null

    const withReplayedValue = startWithReplay ? startWithReplay(this.source) : this.source

    return withReplayedValue.run(new StateSink(this, sink), scheduler)
  }
}

export function replayLatest<A>(s: Stream<A>, initialState?: A): ReplayLatest<A> {
  if (initialState === undefined) {
    return new ReplayLatest(s)
  }
  return new ReplayLatest(s, initialState)
}
