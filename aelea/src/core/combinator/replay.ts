import { startWith } from '../../stream/index.js'
import type { Disposable, IStream, Scheduler, Sink } from '../../stream/types.js'

class StateSink<A> implements Sink<A> {
  constructor(
    private readonly parent: ReplayLatest<A>,
    public sink: Sink<A>
  ) {}

  event(x: A): void {
    this.parent.latestvalue = x
    this.parent.hasValue = true
    this.sink.event(x)
  }

  error(e: any): void {
    this.sink.error(e)
  }

  end(): void {
    this.sink.end()
  }
}

export class ReplayLatest<A> implements IStream<A> {
  latestvalue!: A
  hasValue = false
  hasInitial: boolean

  constructor(
    private readonly source: IStream<A>,
    private readonly initialState?: A
  ) {
    this.hasInitial = initialState !== undefined
  }

  run(scheduler: Scheduler, sink: Sink<A>): Disposable {
    let stream = this.source

    if (this.hasValue) {
      stream = startWith(this.latestvalue, stream)
    } else if (this.hasInitial && this.initialState !== undefined) {
      stream = startWith(this.initialState, stream)
    }

    return stream.run(scheduler, new StateSink(this, sink))
  }
}

export function replayLatest<A>(s: IStream<A>, initialState?: A): IStream<A> {
  return new ReplayLatest(s, initialState)
}
