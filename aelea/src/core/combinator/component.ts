import { behavior, disposeAll, disposeBoth, nullSink } from '../../stream/index.js'
import { stream } from '../stream.js'
import type { I$Slottable, ICreateComponent, IOutputTethers } from '../types.js'

type IComponent = <T>(oTether: ICreateComponent<T>) => (iTether: IOutputTethers<T>) => I$Slottable

export const component: IComponent = callCreate => iTether2 => {
  // Create behavior pairs based on component's arity
  // Each behavior is a [stream, tether] tuple for bidirectional data flow
  const behaviors = Array(callCreate.length).fill(null).map(behavior)
  const [view, outputSources] = callCreate(...behaviors)

  return stream((sink, scheduler) => {
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

    return disposeBoth(view.run(sink, scheduler), disposeAll(outputDisposables))
  })
}
