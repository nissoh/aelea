
import {NodeStream, ElementType, DomNode} from '../types'
import {multicast, empty, map, chain} from '@most/core'
import {splitBehavior, SplitBehavior} from '../behavior'
import {compose} from '@most/prelude'



export type compFn<A extends ElementType, B, C> = (componentFunction: {[k: string]: SplitBehavior<DomNode<A, B, C>, B>}) => NodeStream<A, B, C>

const component = <A extends ElementType, B, C>(inputComp: compFn<A, B, C>): NodeStream<A, B, C> => {
  return {
    run(sink, scheduler) {


      const prox: Parameters<typeof inputComp>[0] = new Proxy({} as any, {
        get(target, p: keyof A) {
          target[p] = target[p] ?? splitBehavior(multicast)
          // target[p] = target[p] ?? splitBehavior(compose(multicast as any, chain((x: any) => x.behavior)))
          return target[p]
        }
      })




      const ns = inputComp(prox)


      return ns.run(sink, scheduler)



      // return snapshot((aa, bb) => aa, ns, be).run(sink, scheduler)
      // return map(([el, fn]) => [el, fn], splitb.sample(ns)).run(sink, scheduler)
      // return merge(ns, eee).run(sink, scheduler)
    }
  }
}




export {component}

