import { Stream, Disposable, Sink, Scheduler } from '@most/types'
import { Op } from './types'
import { disposeAll } from '@most/disposable'
import { O, Pipe } from './utils'
import { startWith } from '@most/core'
import { tether } from './combinator/tether'



export class BehaviorSource<A, B> implements Stream<A> {
  queuedSamplers: Stream<A>[] = []

  sinks: Map<Sink<A>, Disposable | null> = new Map()
  scheduler: Scheduler | undefined

  run(sink: Sink<A>, scheduler: Scheduler): Disposable {

    this.scheduler = scheduler
    this.sinks.set(sink, null)

    if (this.queuedSamplers.length) {
      this.runBehaviors(sink)
    }

    return {
      dispose: () => {
        const d = this.sinks.get(sink)

        if (d) {
          d.dispose()
          this.sinks.delete(sink)
        }
      }
    }
  }

  protected runBehaviors(sink: Sink<A>) {
    const dss = this.queuedSamplers.map(x => {
      return x.run(sink, this.scheduler!)
    })
    this.sinks.set(sink, disposeAll(dss))
  }


  sample = (...ops: Op<B, A>[]) => {
    return (sb: Stream<B>): Stream<B> => {

      const [source, tetherSource] = tether(sb)

      // @ts-ignore
      const bops: Stream<A> = ops.length ? O(...ops)(tetherSource) : tetherSource

      this.queuedSamplers.push(bops)

      this.sinks.forEach((d, s) => {
        this.runBehaviors(s)
      })

      return source
    }
  }
}


export type Sampler<A> = Op<A, A>

export interface Sample<A, B> {
  (): Sampler<A>
  (o1: Op<A, B>): Sampler<A>
  <B1>(o1: Op<A, B1>, o2: Op<B1, B>): Sampler<A>
  <B1, B2>(o1: Op<A, B1>, o2: Op<B1, B2>, o3: Op<B2, B>): Sampler<A>
  <B1, B2, B3>(o1: Op<A, B1>, o2: Op<B1, B2>, o3: Op<B2, B3>, o4: Op<B3, any>, ...oos: Op<any, B>[]): Sampler<A>
}

export type Behavior<A, B> = [Sample<A, B>, BehaviorSource<B, A>]
export type StateBehavior<A, B> = [Sample<A, B>, ReplayLatest<B>]

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
