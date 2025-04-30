import { disposeAll } from "@most/disposable"
import { curry2 } from "@most/prelude"
import type { Disposable, Stream } from "@most/types"
import { nullSink } from "../../core/common.js"
import { behavior } from "../../core/index.js"
import type { Behavior } from "../../core/types.js"
import type { $Node, INodeElement } from "../types.js"
import type { Op } from "../utils.js"


type IComponentOutputBehaviors<T> = {
  [P in keyof T]: Stream<T[P]>
}
type OutputTethers<A> = { [P in keyof A]?: Op<A[P], A[P]> }


type ComponentFunction<A extends INodeElement, B extends $Node<A>, D> = (
  ...args: Behavior<unknown, unknown>[]
) => [B, IComponentOutputBehaviors<D>] | [B]


function componentFn<A extends INodeElement, B extends $Node<A>, D>(
  inputComp: ComponentFunction<A, B, D>,
  outputTethers: OutputTethers<D>
): $Node<A> {
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
      
      return disposeAll([
        // disposeWith(() => {
        //   sink.end(scheduler.currentTime())
        // }, null),
        view.run(sink, scheduler),
        ...outputDisposables,
      ])

    }
  }
}


interface ComponentCurry {
  <A extends INodeElement, B extends $Node<A>, D>(inputComp: ComponentFunction<A, B, D>, projectBehaviors: OutputTethers<D>): B
  <A extends INodeElement, B extends $Node<A>, D>(inputComp: ComponentFunction<A, B, D>): (projectBehaviors: OutputTethers<D>) => B
}

export const component: ComponentCurry = curry2(componentFn)
