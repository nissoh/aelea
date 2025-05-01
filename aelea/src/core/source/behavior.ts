import { disposeWith } from "@most/disposable"
import type { Disposable, Scheduler, Sink, Stream } from "@most/types"
import { tether } from "../combinators/tether.js"
import { O } from "../common.js"
import type { Behavior, Op } from "../types.js"

type SinkMap<T> = Map<Sink<T>, Map<Stream<T>, Disposable | null>>

class BehaviorSource<A, B> implements Stream<A> {
  queuedSamplers: Stream<A>[] = []

  sinksMap: SinkMap<A> = new Map()
  scheduler: Scheduler | undefined

  run(sink: Sink<A>, scheduler: Scheduler): Disposable {
    this.scheduler = scheduler

    const sourcesMap = new Map<Stream<A>, Disposable | null>()
    this.sinksMap.set(sink, sourcesMap)

    for (const s of this.queuedSamplers) {
      sourcesMap.set(s, this.runBehavior(sink, s))
    }

    return disposeWith(([sinkSrc, sinkMap]) => {
      sinkSrc.end(scheduler.currentTime())
      const disposables = sinkMap.get(sinkSrc)
      if (disposables) {
        for (const disposable of disposables.values()) {
          disposable?.dispose()
        }
      }
      sinkMap.delete(sinkSrc)
    }, [sink, this.sinksMap] as [Sink<A>, SinkMap<A>])
  }


  protected runBehavior(sink: Sink<A>, x: Stream<A>) {
    if (!this.scheduler) {
      throw 'BehaviorSource: scheduler is not defined'
    }

    return x.run(sink, this.scheduler)
  }

  sample = (...ops: Op<B, A>[]) => {
    return (sb: Stream<B>): Stream<B> => {
      const [source, tetherSource] = tether(sb)

      // @ts-ignore
      const bops: Stream<A> = ops.length ? O(...ops)(tetherSource) : tetherSource

      this.queuedSamplers.push(bops)
      this.sinksMap.forEach((sourcesMap, sink) => {
        sourcesMap.set(bops, this.runBehavior(sink, bops))
      })

      return source
    }
  }

}

export function behavior<A, B>(): Behavior<A, B> {
  const ss = new BehaviorSource<B, A>()

  return [ss, ss.sample]
}


