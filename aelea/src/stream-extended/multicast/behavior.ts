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

type SubscriberInfo<O> = {
  sink: ISink<O>
  scheduler: IScheduler
  disposables: Map<IStream<O>, Disposable>
}

class BehaviorSource<T> implements IStream<T> {
  private streams = new Set<IStream<T>>() // Use Set to prevent duplicates
  private subscribers = new Map<ISink<T>, SubscriberInfo<T>>()

  addStream(stream: IStream<T>): void {
    // Prevent duplicate streams
    if (this.streams.has(stream)) return

    this.streams.add(stream)

    // Hot-wire to existing subscribers with error isolation
    for (const subscriberInfo of this.subscribers.values()) {
      const { sink, scheduler, disposables } = subscriberInfo
      const disposable = stream.run(sink, scheduler)
      disposables.set(stream, disposable)
    }
  }

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    const disposables = new Map<IStream<T>, Disposable>()

    // Subscribe with error isolation
    for (const stream of this.streams) {
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

export function behavior<I, O = I>(): IBehavior<I, O> {
  const behaviorSource = new BehaviorSource<O>()

  const compose: IComposeBehavior<I, O> = ((...ops: IOps<any, any>[]) => {
    return (source: IStream<I>): IStream<I> => {
      const [s0, s1] = tether(source)

      // @ts-ignore - op accepts variadic arguments
      const transformed = op(s1, ...ops)

      behaviorSource.addStream(transformed)

      return s0
    }
  }) as IComposeBehavior<I, O>

  // Return behavior source (outputs O) and compose function
  return [behaviorSource, compose]
}
