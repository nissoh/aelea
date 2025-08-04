import { behavior, disposeAll, disposeBoth, nullSink } from '../../stream/index.js'
import { stream } from '../stream.js'
import type { I$Slottable, ICreateComponent, INodeElement, IOutputTethers } from '../types.js'

export const component =
  <A extends INodeElement, B extends I$Slottable<A>, D>(bevahiorDefinition: ICreateComponent<A, B, D>) =>
  (outputTethers: IOutputTethers<D>): I$Slottable<A> => {
    // Create behavior pairs based on component's arity
    // Each behavior is a [stream, tether] tuple for bidirectional data flow
    const behaviors = Array(bevahiorDefinition.length).fill(null).map(behavior)
    const [view, outputSources] = bevahiorDefinition(...behaviors)

    return stream((sink, scheduler) => {
      const outputDisposables: Disposable[] = []

      for (const k in outputTethers) {
        if (outputTethers[k] && outputSources) {
          const consumerSampler = outputTethers[k]

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
