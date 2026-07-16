import { disposeWith, type IOps, type IScheduler, type ISink, type IStream, op } from '../../stream/index.js'
import { stream } from '../source/stream.js'
import type { IBehavior, IComposeBehavior } from '../types.js'
import { type FanInContributor, FanInSink } from './sink.js'
import { tether } from './tether.js'

type IWire<T> = {
  contributor: FanInContributor<T>
  subscription: Disposable
}

type SubscriberInfo<T> = {
  scheduler: IScheduler
  fanIn: FanInSink<T>
  wires: Map<IStream<T>, IWire<T>>
}

class BehaviorSource<T> implements IStream<T> {
  samplers: IStream<T>[] = []
  subscribers: SubscriberInfo<T>[] = []

  // Registration is revocable: disposing it removes the sampler and unwires
  // it from every live subscriber, so remounted views do not accumulate dead
  // samplers on a long-lived behavior.
  sample(samplerSource: IStream<T>): Disposable {
    this.samplers.push(samplerSource)

    // Hot-wire to existing subscribers
    for (const subscriber of this.subscribers) {
      this.wire(subscriber, samplerSource)
    }

    return disposeWith(() => {
      const i = this.samplers.indexOf(samplerSource)
      if (i > -1) this.samplers.splice(i, 1)

      for (const subscriber of this.subscribers) {
        const wire = subscriber.wires.get(samplerSource)
        if (wire) {
          subscriber.wires.delete(samplerSource)
          wire.subscription[Symbol.dispose]()
          wire.contributor[Symbol.dispose]()
        }
      }
    })
  }

  private wire(subscriber: SubscriberInfo<T>, samplerSource: IStream<T>): void {
    if (subscriber.fanIn.closed || subscriber.wires.has(samplerSource)) return
    const contributor = subscriber.fanIn.attach()
    const subscription = samplerSource.run(contributor, subscriber.scheduler)
    subscriber.wires.set(samplerSource, { contributor, subscription })
  }

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    // Fan-in: the consumer ends only when ALL its samplers have ended — one
    // completing sampler no longer terminates a sink others still feed.
    const subscriber: SubscriberInfo<T> = { scheduler, fanIn: new FanInSink(sink), wires: new Map() }
    this.subscribers.push(subscriber)

    for (const sampler of this.samplers) {
      this.wire(subscriber, sampler)
    }

    return disposeWith(() => {
      const index = this.subscribers.indexOf(subscriber)
      if (index > -1) {
        this.subscribers.splice(index, 1)
      }
      for (const wire of subscriber.wires.values()) {
        wire.subscription[Symbol.dispose]()
        wire.contributor[Symbol.dispose]()
      }
      subscriber.wires.clear()
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

      // Registration follows the primary's subscription lifetime: the first
      // mount registers the sampler, the last unmount revokes it. The count
      // must survive double-disposal and a throwing source, or the 0→1
      // registration edge desyncs permanently.
      let subscriptions = 0
      let registration: Disposable | null = null

      const release = () => {
        if (--subscriptions === 0 && registration !== null) {
          const r = registration
          registration = null
          r[Symbol.dispose]()
        }
      }

      return stream((sink, scheduler) => {
        if (subscriptions++ === 0) {
          registration = behaviorSource.sample(transformed)
        }
        let sourceSubscription: Disposable
        try {
          sourceSubscription = s0.run(sink, scheduler)
        } catch (err) {
          release()
          throw err
        }
        let disposed = false
        return disposeWith(() => {
          if (disposed) return
          disposed = true
          sourceSubscription[Symbol.dispose]()
          release()
        })
      })
    }
  }) as IComposeBehavior<A, B>

  // Return behavior source (outputs O) and compose function
  return [behaviorSource, compose]
}
