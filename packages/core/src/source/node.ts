import {Scheduler, Sink} from '@most/types'
import {NodeType, NodeStream, Op, DomNode} from '../types'
import {now, never, startWith, map, empty, mergeArray} from '@most/core'


function disposeNode(el: NodeType) {
  if (el.parentElement && el.parentElement.contains(el)) {
    el.parentElement.removeChild(el)
  }
}



export type NodeChildInput<A extends NodeType> = NodeStream<A, any, any> | NodeStream<A, any, any>[] | void

export class NodeSource<A extends NodeType, B, C, D> implements NodeStream<A, B, C> {
  constructor(
    private value: D,
    private op: Op<D, A>,
    private cs: NodeChildInput<NodeType>
  ) {}


  run(sink: Sink<DomNode<A, B, C>>, scheduler: Scheduler) {


    const css = this.cs instanceof Array ? this.cs : [this.cs ? this.cs : empty()]
    const node = this.op(startWith(this.value, never()))


    let parent: A | null = null


    node.run({
      event: (time, node) => {
        parent = node
        sink.event(time, {
          node,
          children: mergeArray(css.map((cs, i) =>
            map(n => ({...n, slot: i}), cs)
          )),
          slot: 0,
          style: now({}),
          behavior: empty()
        })
      },
      error() {

      },
      end() {
        debugger
      }
    }, scheduler)

    return {
      dispose() {
        if (parent) {
          disposeNode(parent)
        }
      }
    }
  }
}




export const create = <A, N extends NodeType, NB extends NodeType>(something: A, op: Op<A, N>) =>
  (cs: NodeChildInput<NB>) =>
    new NodeSource(something, op, cs)

export const element = <K extends keyof HTMLElementTagNameMap>(tagName: K) =>
  create(tagName, map(a => document.createElement(a)))

export const svg = <K extends keyof SVGElementTagNameMap>(tagName: K) =>
  create(tagName, map(a => document.createElementNS('http://www.w3.org/2000/svg', a)))

export const customElement = (tagName: string) =>
  create(tagName, map(a => document.createElement(a)))

export const text = (text: string, ) => {
  const textns: NodeStream<any, any, any> = startWith({node: document.createTextNode(text), children: empty(), style: empty()}, empty())
  return customElement('text')(
    textns
  )
}

export const node = customElement('node')


