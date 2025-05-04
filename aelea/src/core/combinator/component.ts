import { disposeAll } from '@most/disposable'
import { curry2 } from '@most/prelude'
import type { Disposable, Stream } from '@most/types'
import { nullSink } from '../../core/common.js'
import type { INodeElement, IOps } from '../../core/types.js'
import type { I$Node } from '../source/node.js'
import { type IBehavior, behavior } from './behavior.js'

export type IOutputTethers<A> = { [P in keyof A]?: IOps<A[P], A[P]> }

export type IComponentDefinitionCallback<A extends INodeElement, B extends I$Node<A>, D> = (
  ...args: IBehavior<unknown, unknown>[]
) => [B, IComponentOutputBehaviors<D>] | [B]

export type IComponentOutputBehaviors<T> = {
  [P in keyof T]: Stream<T[P]>
}

export interface IComponentCurry {
  <A extends INodeElement, B extends I$Node<A>, D>(
    inputComp: IComponentDefinitionCallback<A, B, D>,
    projectBehaviors: IOutputTethers<D>
  ): B
  <A extends INodeElement, B extends I$Node<A>, D>(
    inputComp: IComponentDefinitionCallback<A, B, D>
  ): (projectBehaviors: IOutputTethers<D>) => B
}

export const component: IComponentCurry = curry2(
  <A extends INodeElement, B extends I$Node<A>, D>(
    inputComp: IComponentDefinitionCallback<A, B, D>,
    outputTethers: IOutputTethers<D>
  ): I$Node<A> => {
    return {
      run(sink, scheduler) {
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
                const outputDisposable = consumerSampler(componentOutputTethers).run(nullSink, scheduler)
                outputDisposables.push(outputDisposable)
              }
            }
          }
        }

        return disposeAll([view.run(sink, scheduler), ...outputDisposables])
      }
    }
  }
)
