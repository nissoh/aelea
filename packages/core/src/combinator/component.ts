
import { NodeStream, NodeType } from '../types'
import { split, Behavior } from '../behavior'



export type compFn<A extends NodeType, B, C> = (
  ...args: Behavior<any, any>[]
) => NodeStream<A, B, C>

const component = <A extends NodeType, B, C>(inputComp: compFn<A, B, C>): NodeStream<A, B, C> => {
  return {
    run(sink, scheduler) {
      // fill mocked aguments as a behavior
      const args = Array(inputComp.length).fill(null).map(split)
      const ns = inputComp(...args)

      return ns.run(sink, scheduler)
    }
  }
}




export { component }

