
import { disposeWith, op, type IOps, type IStream, type Scheduler, type Sink } from '../../stream/index.js'
import { tether } from './tether.js'

type SinkMap<T> = Map<Sink<T>, Map<IStream<T>, Disposable | null>>

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

class IBehaviorSource<I, O> implements IStream<O> {
  queuedBehaviors: IStream<O>[] = []

  sinksMap: SinkMap<O> = new Map()
  scheduler: Scheduler | undefined

  run(scheduler: Scheduler, sink: Sink<O>): Disposable {
    this.scheduler = scheduler

    const sourcesMap = new Map<IStream<O>, Disposable | null>()
    this.sinksMap.set(sink, sourcesMap)

    for (const s of this.queuedBehaviors) {
      sourcesMap.set(s, this.runBehavior(sink, s))
    }

    return disposeWith(
      ([sinkSrc, sinkMap]) => {
        sinkSrc.end()
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

  protected runBehavior(sink: Sink<O>, x: IStream<O>) {
    if (!this.scheduler) throw 'BehaviorSource: scheduler is not defined'

    return x.run(this.scheduler, sink)
  }

  sample: IComposeBehavior<I, O> = (...ops: IOps<I, O>[]) => {
    return (sb: IStream<I>): IStream<I> => {
      const [s0, s1] = tether(sb)

      const bops = op(s1, ...ops)

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
export type IBehavior<A, B = A> = [IStream<B>, IComposeBehavior<A, B>]
