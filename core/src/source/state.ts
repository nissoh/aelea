import { multicast, startWith } from "@most/core";
import { Sink, Stream, Scheduler, Disposable } from "@most/types";
import { StateBehavior } from "../types";
import { Pipe } from "../utils";
import { BehaviorSource } from "./behavior";

export function state<A, B = A>(initialState: A): StateBehavior<B, A> {
  const bs = new BehaviorSource<A, B>()
  const mbs = multicast(bs)

  return [bs.sample, replayLatest(mbs, initialState)]
}



class StateSink<A> extends Pipe<A, A> {

  constructor(private parent: ReplayLatest<A>, public sink: Sink<A>) {
    super(sink)
  }

  event(t: number, x: A): void {
    this.parent.latestvalue = x;
    this.parent.hasValue = true;

    this.sink.event(t, x)
  }

}



export function replayLatest<A>(s: Stream<A>, initialState?: A): ReplayLatest<A> {
  if (arguments.length === 1) {
    return new ReplayLatest(s)
  } else {
    return new ReplayLatest(s, initialState)
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
