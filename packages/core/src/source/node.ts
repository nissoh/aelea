import { Scheduler, Sink, Stream } from '@most/types'
import { NodeType, NodeStream, Op, DomNode, StyleCSS } from '../types'
import { now, map, empty, mergeArray, never, startWith, switchLatest } from '@most/core'
import { O, isArrayOfOps } from 'src/utils'


function disposeNode(el: NodeType) {
  if (el.parentElement && el.parentElement.contains(el)) {
    el.parentElement.removeChild(el)
  }
}



export type NodeCreationInput<B, C> = Op<B, C>[] | NodeStream<NodeType, any, any>[]
export type TextCreationInput<B, C> = string[] | Stream<string>[] | Op<B, C>[]

export class NodeSource<A extends NodeType, B, C, D> implements NodeStream<A, B, C> {
  constructor(
    private value: D,
    private op: Op<D, A>,
    private css: NodeStream<NodeType, any, any>[]
  ) { }


  run(sink: Sink<DomNode<A, B, C>>, scheduler: Scheduler) {

    const ns = this.op(startWith(this.value, never()))

    let parent: A | null = null

    const disp = ns.run({
      event: (time, node) => {
        parent = node
        const childrenStream = this.css.map((cs, i) =>
          map(n => ({ ...n, slot: i }), cs)
        )

        sink.event(time, {
          node,
          children: mergeArray(childrenStream),
          slot: 0,
          style: now({}),
          attributes: now({})
        })
      },
      error(t, err) {
        sink.error(t, err)
      },
      end(t) {
        sink.end(t)
      }
    }, scheduler)

    return {
      dispose() {
        disp.dispose()
        if (parent) {
          disposeNode(parent)
        }
      }
    }
  }
}


const textOp = O(
  map((text: string | Stream<string>) => {
    const txtNode = document.createElement('text')

    if (typeof text === 'string') {
      txtNode.appendChild(document.createTextNode(text))
      return now(txtNode);
    }

    return map(x => {
      txtNode.textContent = x
      return txtNode
    }, text)

  }),

  switchLatest
)


interface Nnode<A extends NodeType, B, C> {
  (...children: NodeStream<NodeType, any, any>[]): NodeStream<A, B, C>
  <BB1, CC1>(o1: Op<DomNode<A, B, C>, DomNode<A, BB1, CC1>>): Nnode<A, B & BB1, C & CC1>
  <BB1, CC1, BB2, CC2>(o1: Op<DomNode<A, B, C>, DomNode<A, BB1, CC1>>, o2: Op<DomNode<A, BB1, CC1>, DomNode<A, BB2, CC2>>): Nnode<A, B & BB1 & BB2, C & CC1 & CC2>
  <BB1, CC1, BB2, CC2, BB3, CC3>(o1: Op<DomNode<A, B, C>, DomNode<A, BB1, CC1>>, o2: Op<DomNode<A, BB1, CC1>, DomNode<A, BB2, CC2>>, o3: Op<DomNode<A, BB2, CC2>, DomNode<A, BB3, CC3>>): Nnode<A, B & BB1 & BB2 & BB3, C & CC1 & CC2 & CC3>
  <BB1, CC1, BB2, CC2, BB3, BB4, CC3, CC4>(o1: Op<DomNode<A, B, C>, DomNode<A, BB1, CC1>>, o2: Op<DomNode<A, BB1, CC1>, DomNode<A, BB2, CC2>>, o3: Op<DomNode<A, BB2, CC2>, DomNode<A, BB3, CC3>>, o4: Op<DomNode<A, BB3, CC3>, DomNode<A, BB4, CC4>>): Nnode<A, B & BB1 & BB2 & BB3 & BB4, C & CC1 & CC2 & CC3 & CC4>
  <BB1, CC1, BB2, CC2, BB3, BB4, CC3, CC4, BB5, CC5>(o1: Op<DomNode<A, B, C>, DomNode<A, BB1, CC1>>, o2: Op<DomNode<A, BB1, CC1>, DomNode<A, BB2, CC2>>, o3: Op<DomNode<A, BB2, CC2>, DomNode<A, BB3, CC3>>, o4: Op<DomNode<A, BB3, CC3>, DomNode<A, BB4, CC4>>, ...o5: Op<DomNode<A, any, any>, DomNode<A, BB5, CC5>>[]): Nnode<A, B & BB1 & BB2 & BB3 & BB4 & BB5, C & CC1 & CC2 & CC3 & CC4 & CC5>
}


export const create = <A, B extends NodeType>(sourceOp: Op<A, B>) => (something: A): Nnode<B, {}, StyleCSS<{}>> => {
  function nnode(...input: NodeCreationInput<A, B>) {
    const isOpsInput = isArrayOfOps(input)

    if (isOpsInput) {
      return <C extends DomNode<B, any, any>>(...args: NodeCreationInput<B, C>) => {

        const opsInput = <Op<any, any>[]>input

        if (isArrayOfOps(args)) {
          return nnode(...opsInput, ...args as Op<any, any>[])
        }

        // @ts-ignore
        const oop = O(...opsInput as any)
        return oop(nnode(...<any>args))
      }
    }

    const children = (input.length ? input : [empty()]) as NodeStream<NodeType, any, any>[]

    return new NodeSource(something, sourceOp, children)
  }

  return nnode as any
}


export const $svg = create(map(<K extends keyof SVGElementTagNameMap>(a: K) => document.createElementNS('http://www.w3.org/2000/svg', a)))
export const $element = create(map(<K extends keyof HTMLElementTagNameMap>(a: K) => document.createElement(a)))
export const $custom = create(map((a: string) => document.createElement(a)))
export const $node = $custom('node')


interface Ntext {
  <A, B>(...children: string[] | Stream<string>[]): NodeStream<HTMLElement, A, B>
  <A1, B1>(...ops: Op<DomNode<HTMLElement, any, any>, DomNode<HTMLElement, A1, B1>>[]): Ntext
}

export const $text: Ntext = <B, C>(...input: TextCreationInput<B, C>): any => {
  const isOpsInput = isArrayOfOps(input)

  if (isOpsInput) {
    return <BB, CC>(...args: TextCreationInput<B & BB,C & CC>): any => {

      const opsInput = <Op<any, any>[]>input

      if (isArrayOfOps(args)) {
        return $text(...opsInput as any, ...args as Op<any, any>[])
      }

      // @ts-ignore
      const oop = O(...opsInput)
      return oop($text(...<any>args))
    }
  }

  return new NodeSource(<any>input[0], textOp, [empty()])
}




