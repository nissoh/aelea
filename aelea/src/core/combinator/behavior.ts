import { disposeWith } from '@most/disposable'
import type { Disposable, Scheduler, Sink, Stream } from '@most/types'
import { O } from '../common.js'
import type { IOps } from '../types.js'
import { tether } from './tether.js'

type SinkMap<T> = Map<Sink<T>, Map<Stream<T>, Disposable | null>>

export interface IComposeBehavior<I, O> {
  (): IOps<I, I>
  (o1: IOps<I, O>): IOps<I, I>
  <O1>(o1: IOps<I, O1>, o2: IOps<O1, O>): IOps<I, I>
  <O1, O2>(o1: IOps<I, O1>, o2: IOps<O1, O2>, o3: IOps<O2, O>): IOps<I, I>
  <O1, O2, O3>(o1: IOps<I, O1>, o2: IOps<O1, O2>, o3: IOps<O2, O3>, o4: IOps<O3, O>): IOps<I, I>
  <B1, B2, B3, B4>(o1: IOps<I, B1>, o2: IOps<B1, B2>, o3: IOps<B2, B3>, o4: IOps<B3, B4>, o5: IOps<B4, O>): IOps<I, I>
  <B1, B2, B3, B4, B5>(
    o1: IOps<I, B1>,
    o2: IOps<B1, B2>,
    o3: IOps<B2, B3>,
    o4: IOps<B3, B4>,
    o5: IOps<B5, O>
  ): IOps<I, I>
  <B1, B2, B3, B4, B5, B6>(
    o1: IOps<I, B1>,
    o2: IOps<B1, B2>,
    o3: IOps<B2, B3>,
    o4: IOps<B3, B4>,
    o5: IOps<B5, B6>,
    ...oos: IOps<unknown, O>[]
  ): IOps<I, I>
}

class IBehaviorSource<I, O> implements Stream<O> {
  queuedBehaviors: Stream<O>[] = []

  sinksMap: SinkMap<O> = new Map()
  scheduler: Scheduler | undefined

  run(sink: Sink<O>, scheduler: Scheduler): Disposable {
    this.scheduler = scheduler

    const sourcesMap = new Map<Stream<O>, Disposable | null>()
    this.sinksMap.set(sink, sourcesMap)

    for (const s of this.queuedBehaviors) {
      sourcesMap.set(s, this.runBehavior(sink, s))
    }

    return disposeWith(
      ([sinkSrc, sinkMap]) => {
        sinkSrc.end(scheduler.currentTime())
        const disposables = sinkMap.get(sinkSrc)
        if (disposables) {
          for (const disposable of disposables.values()) {
            disposable?.dispose()
          }
        }
        sinkMap.delete(sinkSrc)
      },
      [sink, this.sinksMap] as [Sink<O>, SinkMap<O>]
    )
  }

  protected runBehavior(sink: Sink<O>, x: Stream<O>) {
    if (!this.scheduler) throw 'BehaviorSource: scheduler is not defined'

    return x.run(sink, this.scheduler)
  }

  sample: IComposeBehavior<I, O> = (...ops: IOps<any, O>[]) => {
    return (sb: Stream<I>): Stream<I> => {
      const [s0, s1] = tether(sb)

      const bops = O(...ops)(s1)

      this.queuedBehaviors.push(bops)
      this.sinksMap.forEach((sourcesMap, sink) => {
        sourcesMap.set(bops, this.runBehavior(sink, bops))
      })

      return s0
    }
  }
}

export function behavior<T, R>(): IBehavior<T, R> {
  const ss = new IBehaviorSource<T, R>()

  return [ss, ss.sample]
}
export type IBehavior<A, B = A> = [Stream<B>, IComposeBehavior<A, B>]
