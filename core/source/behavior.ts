import { Stream, Disposable, Sink, Scheduler } from '@most/types'
import { Behavior, Op } from '../types'
import { disposeWith } from '@most/disposable'
import { tether } from '../combinators/tether'
import { O } from '../common'

type SinkMap<T> = Map<Sink<T>, Map<Stream<T>, Disposable | null>>

export class BehaviorSource<A, B> implements Stream<A> {
  queuedSamplers: Stream<A>[] = []

  sinksMap: SinkMap<A> = new Map()
  scheduler: Scheduler | undefined

  run(sink: Sink<A>, scheduler: Scheduler): Disposable {
    this.scheduler = scheduler

    const sourcesMap = new Map<Stream<A>, Disposable | null>()
    this.sinksMap.set(sink, sourcesMap)

    this.queuedSamplers.forEach(s => {
      sourcesMap.set(s, this.runBehavior(sink, s))
    })

    return disposeWith(([sinkSrc, sinkMap]) => {
      sinkSrc.end(scheduler.currentTime())
      sinkMap.get(sinkSrc)?.forEach(x => x?.dispose())
      sinkMap.delete(sinkSrc)
    }, [sink, this.sinksMap] as [Sink<A>, SinkMap<A>])
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


