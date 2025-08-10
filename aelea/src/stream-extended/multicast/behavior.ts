import {
  disposeAll,
  disposeWith,
  type IOps,
  type IScheduler,
  type ISink,
  type IStream,
  op
} from '../../stream/index.js'
import type { IBehavior } from '../types.js'
import { tether } from './tether.js'

type SinkMap<T> = Map<ISink<T>, StreamDisposableMap<T>>
type StreamDisposableMap<T> = Map<IStream<T>, Disposable>

class Behavior<I, O> implements IStream<O> {
  behaviorList: IStream<O>[] = []

  sinksMap: SinkMap<O> = new Map()
  scheduler: IScheduler | undefined

  run(sink: ISink<O>, scheduler: IScheduler): Disposable {
    this.scheduler = scheduler

    const behaviorDisposaleMap = this.sinksMap.get(sink) || (new Map() as StreamDisposableMap<O>)
    this.sinksMap.set(sink, behaviorDisposaleMap)

    for (const behavior of this.behaviorList) {
      behaviorDisposaleMap.set(behavior, behavior.run(sink, scheduler))
    }

    return disposeWith(() => {
      disposeAll(behaviorDisposaleMap.values())
      behaviorDisposaleMap.clear()
      this.sinksMap.delete(sink)
    })
  }

  tether(...ops: IOps<any, any>[]) {
    return (sb: IStream<I>): IStream<I> => {
      const [s0, s1] = tether(sb)

      // @ts-ignore - op accepts variadic arguments
      const bops = op(s1, ...ops) as IStream<O>

      this.behaviorList.push(bops)

      if (this.sinksMap.size > 0) {
        const scheduler = this.scheduler

        if (!scheduler) throw new Error('BehaviorSource: scheduler is not defined')

        for (const [sink, sourcesMap] of this.sinksMap) {
          sourcesMap.set(bops, bops.run(sink, scheduler!))
        }
      }

      return s0
    }
  }
}

export function behavior<T, R>(): IBehavior<T, R> {
  const ss = new Behavior<T, R>()

  const tetr = (...ops: IOps<T, R>[]) => ss.tether(...ops)

  return [ss, tetr]
}
