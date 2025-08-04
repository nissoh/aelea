import { behavior, disposeAll, type IBehavior, type IOps, type IStream, nullSink } from '../../stream/index.js'
import { stream } from '../stream.js'
import type { I$Slottable, INodeElement } from '../types.js'

export type IOutputTethers<A> = { [P in keyof A]?: IOps<A[P], A[P]> }

export type ICreateComponent<A extends INodeElement, B extends I$Slottable<A>, D> = (
  ...args: IBehavior<unknown, unknown>[]
) => [B, IComponentBehavior<D>] | [B]

export type IComponentBehavior<T> = {
  [P in keyof T]: IStream<T[P]>
}

export const component =
  <A extends INodeElement, B extends I$Slottable<A>, D>(bevahiorDefinition: ICreateComponent<A, B, D>) =>
  (outputTethers: IOutputTethers<D>): I$Slottable<A> => {
    // Create behavior pairs based on component's arity
    // Each behavior is a [stream, tether] tuple for bidirectional data flow
    const behaviors = Array(bevahiorDefinition.length).fill(null).map(behavior)
    const [view, outputSources] = bevahiorDefinition(...behaviors)

    return stream((sink, scheduler) => {
      const outputDisposables: Disposable[] = []

      // Run all behavior streams to activate them
      const behaviorDisposables = behaviors.map(([behaviorStream]) => behaviorStream.run(nullSink, scheduler))

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

      return disposeAll([view.run(sink, scheduler), ...behaviorDisposables, ...outputDisposables])
    })
  }
