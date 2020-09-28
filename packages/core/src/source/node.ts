import { Scheduler, Sink, Stream, Time } from '@most/types'
import { NodeType, NodeStream, Op, DomNode } from '../types'
import { now, map, switchLatest, startWith, never } from '@most/core'
import { O, isArrayOfOps } from 'src/utils'
import { disposeBoth, disposeNone, disposeWith } from '@most/disposable'



export type ComposeInput<A extends NodeType> = (Op<DomNode<A>, DomNode<A>> | NodeStream<NodeType, any, any>)[]
export type TextCreationInput<A extends NodeType, B extends string> = (B | Stream<B>)[] | ComposeInput<A>

export class NodeSource<A extends NodeType, B, C, D> implements NodeStream<A, B, C> {
  constructor(
    private value: D,
    private op: Op<D, A>,
    private childNodes: NodeStream<NodeType, any, any>[] | []
  ) { }


  run(sink: Sink<DomNode<A, B, C>>, scheduler: Scheduler) {
    const nodeCreation = this.op(startWith(this.value, never()))
    const nodeSink = new NodeSourceSink(sink, this.childNodes, scheduler)
    const disposable = nodeCreation.run(nodeSink, scheduler)

    // return disposable
    return disposeBoth(disposable, nodeSink)
  }
}

class NodeSourceSink<A extends NodeType, B, C> {
  disposable = disposeNone()

  constructor(
    public sink: Sink<DomNode<A, B, C>>,
    public childNodes: NodeStream<NodeType, any, any>[],
    public scheduler: Scheduler
  ) { }

  event(t: Time, node: A): void {

    this.disposable = disposeWith(n => n.remove(), node)

    this.sink.event(t, {
      element: node,
      children: this.childNodes.map((cs, i) =>
        map(n => ({ ...n, slot: i }), cs)
      ),
      slot: 0,
      style: [],
      attributes: []
    })
  }

  end(t: Time) {
    this.sink.end(t)
  }

  error(t: Time, e: Error): void {
    this.sink.error(t, e)
  }

  dispose() {
    this.disposable.dispose()
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


interface ComposeNode<A extends NodeType, B, C> {
  <BB1, CC1>(o1: Op<DomNode<A, B, C>, DomNode<A, BB1, CC1>>): ComposeNode<A, B & BB1, C & CC1>
  <BB1, CC1, BB2, CC2>(o1: Op<DomNode<A, B, C>, DomNode<A, BB1, CC1>>, o2: Op<DomNode<A, BB1, CC1>, DomNode<A, BB2, CC2>>): ComposeNode<A, B & BB1 & BB2, C & CC1 & CC2>
  <BB1, CC1, BB2, CC2, BB3, CC3>(o1: Op<DomNode<A, B, C>, DomNode<A, BB1, CC1>>, o2: Op<DomNode<A, BB1, CC1>, DomNode<A, BB2, CC2>>, o3: Op<DomNode<A, BB2, CC2>, DomNode<A, BB3, CC3>>): ComposeNode<A, B & BB1 & BB2 & BB3, C & CC1 & CC2 & CC3>
  <BB1, CC1, BB2, CC2, BB3, BB4, CC3, CC4>(o1: Op<DomNode<A, B, C>, DomNode<A, BB1, CC1>>, o2: Op<DomNode<A, BB1, CC1>, DomNode<A, BB2, CC2>>, o3: Op<DomNode<A, BB2, CC2>, DomNode<A, BB3, CC3>>, o4: Op<DomNode<A, BB3, CC3>, DomNode<A, BB4, CC4>>): ComposeNode<A, B & BB1 & BB2 & BB3 & BB4, C & CC1 & CC2 & CC3 & CC4>
  <BB1, CC1, BB2, CC2, BB3, BB4, CC3, CC4, BB5, CC5>(o1: Op<DomNode<A, B, C>, DomNode<A, BB1, CC1>>, o2: Op<DomNode<A, BB1, CC1>, DomNode<A, BB2, CC2>>, o3: Op<DomNode<A, BB2, CC2>, DomNode<A, BB3, CC3>>, o4: Op<DomNode<A, BB3, CC3>, DomNode<A, BB4, CC4>>, ...o5: Op<DomNode<A, any, any>, DomNode<A, BB5, CC5>>[]): ComposeNode<A, B & BB1 & BB2 & BB3 & BB4 & BB5, C & CC1 & CC2 & CC3 & CC4 & CC5>

  (...children: NodeStream<NodeType, any, any>[]): NodeStream<A, B, C>
}


export const create = <A, B extends NodeType>(sourceOp: Op<A, B>) => (something: A): ComposeNode<B, any, any> => {

  return function composeOps(...input: ComposeInput<B>) {

    if (isArrayOfOps(input)) {
      return (...args: ComposeInput<B>): any => {

        // @ts-ignore
        const accumulatedOps: Op<any, any> = O(...input)

        if (isArrayOfOps(args)) {
          return composeOps(accumulatedOps, ...args)
        }

        // @ts-ignore
        return accumulatedOps(create(sourceOp)(something)(...args))
      }
    }

    return new NodeSource(
      something,
      sourceOp,
      input.length ? input as NodeStream<NodeType, any, any>[] : [never()]
    ) as any
  }
}


export const $svg = create(map(<K extends keyof SVGElementTagNameMap>(a: K) => document.createElementNS('http://www.w3.org/2000/svg', a)))
export const $element = create(map(<K extends keyof HTMLElementTagNameMap>(a: K) => document.createElement(a)))
export const $custom = create(map((a: string) => document.createElement(a)))
export const $node = $custom('node')
export const wrapNativeElement = create(map((rootNode: HTMLElement) => rootNode))

interface Ntext {
  <A, B extends string>(...children: B[] | Stream<B>[]): NodeStream<HTMLElement, A, B>
  <A1, B1>(...ops: Op<DomNode<HTMLElement, any, any>, DomNode<HTMLElement, A1, B1>>[]): Ntext
}

export const $text: Ntext = <A extends NodeType, B extends string>(...input: TextCreationInput<A, B>): any => {

  if (isArrayOfOps(input)) {
    return <BB>(...args: TextCreationInput<A, B & BB>) => {

      const opsInput = <Op<any, any>[]>input

      if (isArrayOfOps(args)) {
        return $text(...opsInput as any, ...args as Op<any, any>[]) as NodeStream<HTMLElement, A, B>
      }

      // @ts-ignore
      const oop = O(...opsInput)
      return oop($text(...<any>args))
    }
  }

  return new NodeSource(<any>input[0], textOp, [])
}




