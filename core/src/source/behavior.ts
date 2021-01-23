import { Stream, Disposable, Sink, Scheduler } from '@most/types'
import { Behavior, Op, StateBehavior } from '../types'
import { disposeWith } from '@most/disposable'
import { O, Pipe } from '../utils'
import { startWith } from '@most/core'
import { tether } from '../combinators/tether'


export class BehaviorSource<A, B> implements Stream<A> {
  queuedSamplers: Stream<A>[] = []

  sinks: Map<Sink<A>, Map<Stream<A>, Disposable | null>> = new Map()
  scheduler: Scheduler | undefined

  run(sink: Sink<A>, scheduler: Scheduler): Disposable {

    this.scheduler = scheduler

    const sourcesMap = new Map<Stream<A>, Disposable | null>()
    this.sinks.set(sink, sourcesMap)

    this.queuedSamplers.forEach(s => {
      sourcesMap.set(s, this.runBehavior(sink, s))
    })

    return disposeWith((s) => {
      console.log('running behavior disposed')
      sink.end(scheduler.currentTime())
      this.disposeSampler(s)
    }, sink)
  }

  disposeSampler(sink: Sink<A>) {
    this.sinks.get(sink)?.forEach(x => x?.dispose())
    this.sinks.delete(sink)
  }

  protected runBehavior(sink: Sink<A>, x: Stream<A>) {
    return x.run(sink, this.scheduler!)
  }


  sample = (...ops: Op<B, A>[]) => {
    return (sb: Stream<B>): Stream<B> => {

      const [source, tetherSource] = tether(sb)

      // @ts-ignore
      const bops: Stream<A> = ops.length ? O(...ops)(tetherSource) : tetherSource

      this.queuedSamplers.push(bops)

      this.sinks.forEach((sourcesMap, sink) => {
        sourcesMap.set(bops, this.runBehavior(sink, bops))
      })

      return source
    }
  }
}



export function behavior<A, B>(): Behavior<A, B> {
  const ss = new BehaviorSource<B, A>()

  return [ss.sample, ss]
}


export function state<A, B>(initialState: B): StateBehavior<A, B> {
  const ss = new BehaviorSource<B, A>()

  return [ss.sample, replayLatest(ss, initialState)]
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

  constructor(
    private source: Stream<A>,
    private initialState?: A,
  ) {
    this.hasInitial = arguments.length === 2
  }

  run(sink: Sink<A>, scheduler: Scheduler): Disposable {
    const startWithReplay = this.hasValue
      ? startWith(this.latestvalue)
      : this.hasInitial
        ? startWith(this.initialState)
        : null

    const withReplayedValue = startWithReplay ? startWithReplay(this.source) : this.source

    // return this.source.run(new StateSink(this, sink), scheduler)
    return withReplayedValue.run(new StateSink(this, sink), scheduler)
  }

}
