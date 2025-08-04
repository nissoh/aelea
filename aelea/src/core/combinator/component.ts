import { behavior, curry2, disposeAll, type IBehavior, type IOps, type IStream, nullSink } from '../../stream/index.js'
import { stream } from '../stream.js'
import type { I$Slottable, INodeElement } from '../types.js'

export type IOutputTethers<A> = { [P in keyof A]?: IOps<A[P], A[P]> }

export type IComponentDefinitionCallback<A extends INodeElement, B extends I$Slottable<A>, D> = (
  ...args: IBehavior<unknown, unknown>[]
) => [B, IComponentOutputBehaviors<D>] | [B]

export type IComponentOutputBehaviors<T> = {
  [P in keyof T]: IStream<T[P]>
}

export const component: IComponentCurry = curry2(
  <A extends INodeElement, B extends I$Slottable<A>, D>(
    inputComp: IComponentDefinitionCallback<A, B, D>,
    outputTethers: IOutputTethers<D>
  ): I$Slottable<A> => {
    return stream((scheduler, sink) => {
      // fill stubbed aguments as a behavior
      const behaviors = Array(inputComp.length).fill(null).map(behavior)
      const [view, outputSources] = inputComp(...behaviors)
      const outputDisposables: Disposable[] = []

      if (outputTethers) {
        for (const k in outputTethers) {
          if (outputTethers[k] && outputSources) {
            const consumerSampler = outputTethers[k]

            if (consumerSampler) {
              const componentOutputTethers = outputSources[k]
              const outputDisposable = consumerSampler(componentOutputTethers).run(scheduler, nullSink)
              outputDisposables.push(outputDisposable)
            }
          }
        }
      }

      return disposeAll([view.run(scheduler, sink), ...outputDisposables])
    })
  }
)

export interface IComponentCurry {
  <A extends INodeElement, B extends I$Slottable<A>, D>(
    inputComp: IComponentDefinitionCallback<A, B, D>,
    projectBehaviors: IOutputTethers<D>
  ): B
  <A extends INodeElement, B extends I$Slottable<A>, D>(
    inputComp: IComponentDefinitionCallback<A, B, D>
  ): (projectBehaviors: IOutputTethers<D>) => B
}
