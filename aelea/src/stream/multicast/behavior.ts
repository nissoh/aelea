import type { IComposeBehavior, IOps, IStream, Scheduler, Sink } from '../types.js'
import { disposeWith } from '../utils/disposable.js'
import { op } from '../utils/function.js'
import { tether } from './tether.js'

type SinkMap<T> = Map<Sink<T>, Map<IStream<T>, Disposable | null>>

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
            if (disposable) disposable[Symbol.dispose]()
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

  sample: IComposeBehavior<I, O> = (...ops: IOps<any, O>[]) => {
    return (sb: IStream<I>): IStream<I> => {
      const [s0, s1] = tether(sb)

      // @ts-ignore
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
