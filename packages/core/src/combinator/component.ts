
import { NodeStream, NodeType, Op } from '../types'
import { behavior, Behavior } from '../behavior'
import { disposeAll } from '@most/disposable'
import { Disposable, Stream } from '@most/types'
import { curry2 } from '@most/prelude'
import { nullSink } from 'src'

export type IComponentOutputBehaviors<T> = {
  [P in keyof T]: Stream<T[P]>
}

export type compFn<A extends NodeType, B, C, D> = (
  ...args: Behavior<any, any>[]
) => [NodeStream<A, B, C>, IComponentOutputBehaviors<D>] | [NodeStream<A, B, C>]

interface Component {
  <A extends NodeType, B, C, D>(inputComp: compFn<A, B, C, D>): (projectBehaviors?: { [P in keyof D]: Op<D[P], D[P]>; } | undefined) => NodeStream<A, B, C>
  <A extends NodeType, B, C, D>(inputComp: compFn<A, B, C, D>, projectBehaviors?: { [P in keyof D]: Op<D[P], D[P]>; } | undefined): NodeStream<A, B, C>
}

function componentFn<A extends NodeType, B, C, D>(inputComp: compFn<A, B, C, D>, projectBehaviors?: { [P in keyof D]: Op<D[P], D[P]> }): NodeStream<A, B, C> {
  return {
    run(sink, scheduler) {
      // fill stubbed aguments as a behavior
      const behaviors = Array(inputComp.length).fill(null).map(behavior)
      const [view, outputBehaviors] = inputComp(...behaviors)
      const outputDisposables: Disposable[] = []

      if (projectBehaviors) {
        for (const k in projectBehaviors) {
          if (projectBehaviors[k] && outputBehaviors) {
            const projectSampler = projectBehaviors[k]
            const componentOutputBehavior = outputBehaviors[k]
            const outputDisposable = projectSampler(componentOutputBehavior).run(nullSink, scheduler)

            outputDisposables.push(outputDisposable)
          }
        }
      }

      return disposeAll([
        view.run(sink, scheduler),
        ...outputDisposables,
        // ...behaviors.map(([s, b]) => b as BehaviorSource<any, any>),
      ])

    }
  }
}



export const component: Component = curry2(componentFn)

