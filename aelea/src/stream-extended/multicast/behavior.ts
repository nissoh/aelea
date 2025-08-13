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
  disposables: Disposable[]
}

class BehaviorSource<T> implements IStream<T> {
  private samplers: IStream<T>[] = []
  private subscribers: SubscriberInfo<T>[] = []

  sample(samplerSource: IStream<T>): void {
    // Prevent duplicate streams
    if (this.samplers.includes(samplerSource)) return

    this.samplers.push(samplerSource)

    // Hot-wire to existing subscribers
    for (const { sink, scheduler, disposables } of this.subscribers) {
      disposables.push(samplerSource.run(sink, scheduler))
    }
  }

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    const disposables: Disposable[] = []

    // Subscribe to all samplers
    for (const sampler of this.samplers) {
      disposables.push(sampler.run(sink, scheduler))
    }

    const subscriberInfo: SubscriberInfo<T> = { sink, scheduler, disposables }
    this.subscribers.push(subscriberInfo)

    return disposeWith(() => {
      disposeAll(disposables)
      const index = this.subscribers.indexOf(subscriberInfo)
      if (index > -1) {
        this.subscribers.splice(index, 1)
      }
    })
  }
}

export function behavior<A, B = A>(): IBehavior<A, B> {
  const behaviorSource = new BehaviorSource<B>()

  const compose: IComposeBehavior<A, B> = ((...ops: IOps<any, any>[]) => {
    return (source: IStream<A>): IStream<A> => {
      const [s0, s1] = tether(source)

      // Apply operations with proper typing
      const transformed = (op as any)(s1, ...ops)

      behaviorSource.sample(transformed)

      return s0
    }
  }) as IComposeBehavior<A, B>

  // Return behavior source (outputs O) and compose function
  return [behaviorSource, compose]
}
