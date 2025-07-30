import { disposeAll, type IOps, type IStream, nullSink } from '../../stream/index.js'
import type { I$Slottable, INodeElement } from '../source/node.js'
import { behavior, type IBehavior } from './behavior.js'

export type IOutputTethers<A> = { [P in keyof A]?: IOps<A[P], A[P]> }

export type IComponentDefinitionCallback<A extends INodeElement, B extends I$Slottable<A>, D> = (
  ...args: IBehavior<unknown, unknown>[]
) => [B, IComponentOutputBehaviors<D>] | [B]

export type IComponentOutputBehaviors<T> = {
  [P in keyof T]: IStream<T[P]>
}

export type I$Component<A extends INodeElement, B extends I$Slottable<A>, D> = (
  outputTethers: IOutputTethers<D>
) => I$Slottable<A>

export const component =
  <A extends INodeElement, B extends I$Slottable<A>, D>(
    inputComp: IComponentDefinitionCallback<A, B, D>
  ): I$Component<A, B, D> =>
  (outputTethers: IOutputTethers<D>): I$Slottable<A> => {
    return {
      run(scheduler, sink) {
        const behaviors = Array(inputComp.length).fill(null).map(behavior)
        const [view, outputSources] = inputComp(...behaviors)
        const behaviorDisposableList: Disposable[] = []

        if (outputTethers) {
          for (const k in outputTethers) {
            if (outputTethers[k] && outputSources) {
              const consumerSampler = outputTethers[k]

              if (consumerSampler) {
                const componentOutputTethers = outputSources[k]
                const outputDisposable = consumerSampler(componentOutputTethers).run(scheduler, nullSink)
                behaviorDisposableList.push(outputDisposable)
              }
            }
          }
        }

        const viewDisposable = view.run(scheduler, sink)

        return disposeAll([viewDisposable, ...behaviorDisposableList])
      }
    }
  }
