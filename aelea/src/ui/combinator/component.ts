import { behavior, disposeAll, disposeBoth, type IBehavior, nullSink } from '../../stream/index.js'
import { stream } from '../stream.js'
import type { I$Slottable, IComponentBehavior, IOutputTethers } from '../types.js'

type IComponent = <T>(
  oTether: (...args: IBehavior<unknown, unknown>[]) => [I$Slottable, IComponentBehavior<T>] | [I$Slottable]
) => (iTether: IOutputTethers<T>) => I$Slottable

export const component: IComponent = createCallback => iTether2 => {
  return stream((sink, scheduler) => {
    // Create behavior pairs based on component's arity
    // Each behavior is a [stream, tether] tuple for bidirectional data flow
    const behaviors = Array(createCallback.length).fill(null).map(behavior)
    const [view, outputSources] = createCallback(...behaviors)

    if (outputSources === undefined || Object.keys(outputSources).length === 0) {
      return view.run(sink, scheduler)
    }

    const outputDisposables: Disposable[] = []

    for (const k in iTether2) {
      if (iTether2[k] && outputSources) {
        const consumerSampler = iTether2[k]

        if (consumerSampler) {
          const componentOutputTethers = outputSources[k]
          const outputDisposable = consumerSampler(componentOutputTethers).run(nullSink, scheduler)
          outputDisposables.push(outputDisposable)
        }
      }
    }

    const viewDisposable = view.run(sink, scheduler)
    return disposeBoth(viewDisposable, disposeAll(outputDisposables))
  })
}
