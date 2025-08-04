import type { IBehavior, IComposeBehavior, IOps, IScheduler, ISink, IStream } from '../types.js'
import { disposeWith } from '../utils/disposable.js'
import { op } from '../utils/function.js'
import { tether } from './tether.js'

type SinkMap<T> = Map<ISink<T>, Map<IStream<T>, Disposable | null>>

/**
 * BehaviorSource implements a dynamic multicast pattern where:
 * - Multiple input streams can be registered dynamically via the `sample` method
 * - Each input is transformed and added to the behavior's output
 * - The behavior output merges all transformed inputs
 * - Input streams pass through unchanged (for further composition)
 *
 * Pattern visualization:
 * ```
 * Component
 *     |
 *     v
 * Behaviors[] (created based on arity)
 *     |
 *     v
 * Tether (splits each input)
 *    / \
 *   s0  s1
 *   |    |
 *   |    v
 *   |   Transform (ops)
 *   |    |
 *   |    v
 *   |   Behavior Output (merged)
 *   |
 *   v
 * Pass-through
 * ```
 *
 * This enables the component pattern where DOM events flow through behaviors
 * while also being available for output/composition.
 */
class IBehaviorSource<I, O> implements IStream<O> {
  queuedBehaviors: IStream<O>[] = []

  sinksMap: SinkMap<O> = new Map()
  scheduler: IScheduler | undefined

  run(sink: ISink<O>, scheduler: IScheduler): Disposable {
    this.scheduler = scheduler

    const sourcesMap = new Map<IStream<O>, Disposable | null>()
    this.sinksMap.set(sink, sourcesMap)

    for (const s of this.queuedBehaviors) {
      sourcesMap.set(s, this.runBehavior(sink, s))
    }

    return disposeWith(() => {
      sink.end()
      const sourcesMap = this.sinksMap.get(sink)
      if (sourcesMap) {
        for (const disposable of sourcesMap.values()) {
          if (disposable) disposable[Symbol.dispose]()
        }
        this.sinksMap.delete(sink)
      }
    })
  }

  protected runBehavior(sink: ISink<O>, x: IStream<O>) {
    if (!this.scheduler) throw new Error('BehaviorSource: scheduler is not defined')

    return x.run(sink, this.scheduler)
  }

  /**
   * Creates a sampling function that:
   * 1. Takes an input stream
   * 2. Splits it via tether into [passthrough, sampling]
   * 3. Transforms the sampling stream with provided operations
   * 4. Adds the transformed stream to this behavior's output
   * 5. Returns the passthrough stream for further composition
   */
  sample: IComposeBehavior<I, O> = (...ops: IOps<any, any>[]) => {
    return (sb: IStream<I>): IStream<I> => {
      // Split the input: s0 passes through, s1 is for transformation
      const [s0, s1] = tether(sb)

      // Transform s1 with the provided operations
      // @ts-ignore - op accepts variadic arguments
      const bops = op(s1, ...ops) as IStream<O>

      // Add to queued behaviors for new subscribers
      this.queuedBehaviors.push(bops)

      // Connect immediately to any active sinks
      this.sinksMap.forEach((sourcesMap, sink) => {
        sourcesMap.set(bops, this.runBehavior(sink, bops))
      })

      // Return the passthrough stream
      return s0
    }
  }
}

/**
 * Creates a behavior pattern for reactive event handling.
 *
 * @returns A tuple of:
 * - [0] Stream that merges all registered behaviors
 * - [1] Sample function to register new input streams
 *
 * @example
 * const [clicks, clickTether] = behavior<MouseEvent, boolean>()
 * // In component:
 * clickTether(nodeEvent('click'), map(e => e.button === 0))
 * // clicks stream now emits true/false for left clicks
 */
export function behavior<T, R>(): IBehavior<T, R> {
  const ss = new IBehaviorSource<T, R>()

  return [ss, ss.sample]
}
