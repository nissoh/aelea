
import { Behavior, $Node, INodeElement, Op } from '../types'
import { behavior } from '../source/behavior'
import { disposeAll, disposeWith } from '@most/disposable'
import { Disposable, Stream } from '@most/types'
import { curry2 } from '@most/prelude'
import { nullSink } from '../utils'

export type IComponentOutputBehaviors<T> = {
  [P in keyof T]: Stream<T[P]>
}
export type OutputBehaviors<A> = { [P in keyof A]?: Op<A[P], A[P]> }


export type ComponentFunction<A extends INodeElement, B extends $Node<A>, D> = (
  ...args: Behavior<unknown, unknown>[]
) => [B, IComponentOutputBehaviors<D>] | [B]


export function componentFn<A extends INodeElement, B extends $Node<A>, D>(
  inputComp: ComponentFunction<A, B, D>,
  projectBehaviors: OutputBehaviors<D>
): $Node<A> {
  return {
    run(sink, scheduler) {
      // fill stubbed aguments as a behavior
      const behaviors = Array(inputComp.length).fill(null).map(behavior)
      const [view, outputBehaviors] = inputComp(...behaviors)
      const outputDisposables: Disposable[] = []

      if (projectBehaviors) {
        for (const k in projectBehaviors) {
          if (projectBehaviors[k] && outputBehaviors) {
            const consumerSampler = projectBehaviors[k]

            if (consumerSampler) {
              const componentOutputBehavior = outputBehaviors[k]
              const outputDisposable = consumerSampler(componentOutputBehavior).run(nullSink, scheduler)
              outputDisposables.push(outputDisposable)
            }
          }
        }
      }
      
      return disposeAll([
        disposeWith(() => {
          sink.end(scheduler.currentTime())
          console.log(view)
        }, null),
        view.run(sink, scheduler),
        ...outputDisposables,

        // ...behaviors.map(([s, b]) => b as BehaviorSource<any, any>),
      ])

    }
  }
}


interface ComponentCurry {
  <A extends INodeElement, B extends $Node<A>, D>(inputComp: ComponentFunction<A, B, D>, projectBehaviors: OutputBehaviors<D>): B
  <A extends INodeElement, B extends $Node<A>, D>(inputComp: ComponentFunction<A, B, D>): (projectBehaviors: OutputBehaviors<D>) => B
}

export const component: ComponentCurry = curry2(componentFn)
