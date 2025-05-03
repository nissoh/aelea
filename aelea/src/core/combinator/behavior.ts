import { disposeWith } from '@most/disposable'
import type { Disposable, Scheduler, Sink, Stream } from '@most/types'
import { O } from '../common.js'
import type { Behavior, Ops } from '../types.js'
import { tether } from './tether.js'

type SinkMap<T> = Map<Sink<T>, Map<Stream<T>, Disposable | null>>

class BehaviorSource<T, R> implements Stream<R> {
  queuedBehaviors: Stream<R>[] = []

  sinksMap: SinkMap<R> = new Map()
  scheduler: Scheduler | undefined

  run(sink: Sink<R>, scheduler: Scheduler): Disposable {
    this.scheduler = scheduler

    const sourcesMap = new Map<Stream<R>, Disposable | null>()
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
      [sink, this.sinksMap] as [Sink<R>, SinkMap<R>]
    )
  }

  protected runBehavior(sink: Sink<R>, x: Stream<R>) {
    if (!this.scheduler) throw 'BehaviorSource: scheduler is not defined'

    return x.run(sink, this.scheduler)
  }

  sample = (...ops: Ops<any, R>[]) => {
    return (sb: Stream<T>): Stream<T> => {
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

export function behavior<T, R>(): Behavior<T, R> {
  const ss = new BehaviorSource<T, R>()

  return [ss, ss.sample]
}
