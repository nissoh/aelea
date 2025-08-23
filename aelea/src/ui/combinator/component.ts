import { disposeAll, disposeBoth, type IScheduler, type ISink, type IStream, nullSink } from '../../stream/index.js'
import { behavior, type IBehavior } from '../../stream-extended/index.js'
import type { I$Slottable, IComponentBehavior, IOutputTethers, ISlottable } from '../types.js'

type IComponent = <T>(
  createCallback: (...args: IBehavior<unknown, unknown>[]) => [I$Slottable, IComponentBehavior<T>] | [I$Slottable]
) => (iTether: IOutputTethers<T>) => I$Slottable

/**
 * Stream that represents a component with bidirectional data flow
 */
class Component<T> implements IStream<ISlottable> {
  constructor(
    readonly createCallback: (
      ...args: IBehavior<unknown, unknown>[]
    ) => [I$Slottable, IComponentBehavior<T>] | [I$Slottable],
    readonly outputTethers: IOutputTethers<T>
  ) {}

  run(sink: ISink<ISlottable>, scheduler: IScheduler): Disposable {
    // Create behavior pairs based on component's arity
    // Each behavior is a [stream, tether] tuple for bidirectional data flow
    const behaviors = Array.from({ length: this.createCallback.length }, behavior)
    const [view, outputSources] = this.createCallback(...behaviors)

    if (outputSources === undefined || Object.keys(outputSources).length === 0) {
      return view.run(sink, scheduler)
    }

    const outputDisposables: Disposable[] = []

    for (const k in this.outputTethers) {
      if (this.outputTethers[k] && outputSources) {
        const consumerSampler = this.outputTethers[k]

        if (consumerSampler) {
          const componentOutputTethers = outputSources[k]
          const outputDisposable = consumerSampler(componentOutputTethers).run(nullSink, scheduler)
          outputDisposables.push(outputDisposable)
        }
      }
    }

    const viewDisposable = view.run(sink, scheduler)
    return disposeBoth(viewDisposable, disposeAll(outputDisposables))
  }
}

export const component: IComponent = createCallback => outputTethers => {
  return new Component(createCallback, outputTethers)
}
