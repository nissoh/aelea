import { disposeAll, disposeBoth, type IScheduler, type ISink, type IStream } from '../../stream/index.js'
import { behavior, type IBehavior } from '../../stream-extended/index.js'
import type { I$Slottable, IComponentBehavior, IOutputTethers, ISlottable } from '../types.js'

export interface IPort<A, B = A> {
  readonly __portA?: A
  readonly __portB?: B
}

const PORT: IPort<unknown, unknown> = {}

export function port<A, B = A>(): IPort<A, B> {
  return PORT as IPort<A, B>
}

export type IPortBehaviors<P> = {
  [K in keyof P]: P[K] extends IPort<infer A, infer B> ? IBehavior<A, B> : never
}

type IComponentResult<T> = [I$Slottable, IComponentBehavior<T>] | [I$Slottable]

type IComponentFn = <T>(
  createCallback: (...args: IBehavior<unknown, unknown>[]) => IComponentResult<T>
) => (iTether: IOutputTethers<T>) => I$Slottable

type IPortsComponentFn = <P extends Record<string, IPort<any, any>>, T>(
  ports: P,
  createCallback: (behaviors: IPortBehaviors<P>) => IComponentResult<T>
) => (iTether: IOutputTethers<T>) => I$Slottable

type IComponent = IComponentFn & { ports: IPortsComponentFn }

/**
 * Stream that represents a component with bidirectional data flow
 */
class Component<T> implements IStream<ISlottable> {
  constructor(
    readonly build: () => IComponentResult<T>,
    readonly outputTethers: IOutputTethers<T>
  ) {}

  run(sink: ISink<ISlottable>, scheduler: IScheduler): Disposable {
    const [view, outputSources] = this.build()

    const outputDisposables: Disposable[] = []
    // Output pipelines run for their side effect (pumping child outputs into
    // the parent's behaviors). Errors are applicative traffic and already
    // reach the actual behavior consumers through the tether side — the
    // primary-side sink deliberately drops them rather than duplicating every
    // recoverable error into the render error channel.
    const outputSink: ISink<unknown> = {
      event() {},
      end() {},
      error() {}
    }

    for (const k in this.outputTethers) {
      const consumerSampler = this.outputTethers[k]
      if (!consumerSampler) continue

      const outputSource = outputSources?.[k]
      if (outputSource === undefined) {
        const available = outputSources ? Object.keys(outputSources).join(', ') || '(none)' : '(none)'
        sink.error(
          scheduler.time(),
          new Error(`[aelea] component tether '${String(k)}' has no matching output; outputs: ${available}`)
        )
        continue
      }

      outputDisposables.push(consumerSampler(outputSource).run(outputSink, scheduler))
    }

    const viewDisposable = view.run(sink, scheduler)
    return outputDisposables.length === 0 ? viewDisposable : disposeBoth(viewDisposable, disposeAll(outputDisposables))
  }
}

const componentFn: IComponentFn = createCallback => outputTethers =>
  new Component(() => {
    // Arity-driven behavior creation (positional form): one behavior per
    // declared parameter of the callback.
    const behaviors = Array.from({ length: createCallback.length }, behavior)
    return createCallback(...behaviors)
  }, outputTethers)

const portsFn: IPortsComponentFn = (ports, createCallback) => outputTethers =>
  new Component(() => {
    const behaviors = {} as Record<string, IBehavior<unknown, unknown>>
    for (const k in ports) {
      behaviors[k] = behavior()
    }
    return createCallback(behaviors as never)
  }, outputTethers)

export const component: IComponent = Object.assign(componentFn, { ports: portsFn })
