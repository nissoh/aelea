import { startWith } from "@most/core"
import { Disposable, Scheduler, Sink, Stream } from "@most/types"
import { Pipe } from "../common"


class StateSink<A> extends Pipe<A, A> {
  constructor(private parent: ReplayLatest<A>, public sink: Sink<A>) {
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

  constructor(private source: Stream<A>,
              private initialState?: A,) {
    this.hasInitial = arguments.length === 2
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
  if (arguments.length === 1) {
    return new ReplayLatest(s)
  } else {
    return new ReplayLatest(s, initialState)
  }
}

