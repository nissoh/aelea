import {
  disposeAll,
  disposeWith,
  type IOps,
  type IScheduler,
  type ISink,
  type IStream,
  op
} from '../../stream/index.js'
import type { IBehavior, IComposeBehavior } from '../types.js'
import { tether } from './tether.js'

type SubscriberInfo<T> = {
  sink: ISink<T>
  scheduler: IScheduler
  disposables: Map<IStream<T>, Disposable>
}

class BehaviorSource<T> implements IStream<T> {
  private samplerList = new Set<IStream<T>>() // Use Set to prevent duplicates
  private subscribers = new Map<ISink<T>, SubscriberInfo<T>>()

  sample(samplerSource: IStream<T>): void {
    // Prevent duplicate streams
    if (this.samplerList.has(samplerSource)) return

    this.samplerList.add(samplerSource)

    // Hot-wire to existing subscribers with error isolation
    for (const subscriberInfo of this.subscribers.values()) {
      const { sink, scheduler, disposables } = subscriberInfo
      const disposable = samplerSource.run(sink, scheduler)
      disposables.set(samplerSource, disposable)
    }
  }

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    const disposables = new Map<IStream<T>, Disposable>()

    // Subscribe with error isolation
    for (const stream of this.samplerList) {
      disposables.set(stream, stream.run(sink, scheduler))
    }

    const subscriberInfo: SubscriberInfo<T> = { sink, scheduler, disposables }
    this.subscribers.set(sink, subscriberInfo)

    return disposeWith(() => {
      disposeAll(disposables.values())
      this.subscribers.delete(sink)
    })
  }
}

export function behavior<A, B = A>(): IBehavior<A, B> {
  const behaviorSource = new BehaviorSource<B>()

  const compose: IComposeBehavior<A, B> = ((...ops: IOps<any, any>[]) => {
    return (source: IStream<A>): IStream<A> => {
      const [s0, s1] = tether(source)

      // @ts-ignore - op accepts variadic arguments
      const transformed = op(s1, ...ops)

      behaviorSource.sample(transformed)

      return s0
    }
  }) as IComposeBehavior<A, B>

  // Return behavior source (outputs O) and compose function
  return [behaviorSource, compose]
}
