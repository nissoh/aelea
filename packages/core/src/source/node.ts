import { Scheduler, Sink, Stream, Time } from '@most/types'
import { NodeType, NodeStream, Op, DomNode } from '../types'
import { now, map, switchLatest, startWith, never } from '@most/core'
import { O, isStream } from 'src/utils'
import { disposeBoth, disposeNone, disposeWith } from '@most/disposable'
import { compose, id } from '@most/prelude'



export type ComposeInput<A extends NodeType> = Op<DomNode<A>, DomNode<A>>[] | NodeStream<A>[]
export type TextCreationInput = (string | Stream<string>) | Op<DomNode<HTMLElement>, DomNode<HTMLElement>>

export interface NodeComposeFn<A extends NodeType, B = {}, C = {}> {
  <BB1, CC1>(o1: Op<DomNode<A, B, C>, DomNode<A, BB1, CC1>>): NodeComposeFn<A, B & BB1, C & CC1>
  <BB1, CC1, BB2, CC2>(o1: Op<DomNode<A, B, C>, DomNode<A, BB1, CC1>>, o2: Op<DomNode<A, BB1, CC1>, DomNode<A, BB2, CC2>>): NodeComposeFn<A, B & BB1 & BB2, C & CC1 & CC2>
  <BB1, CC1, BB2, CC2, BB3, CC3>(o1: Op<DomNode<A, B, C>, DomNode<A, BB1, CC1>>, o2: Op<DomNode<A, BB1, CC1>, DomNode<A, BB2, CC2>>, o3: Op<DomNode<A, BB2, CC2>, DomNode<A, BB3, CC3>>): NodeComposeFn<A, B & BB1 & BB2 & BB3, C & CC1 & CC2 & CC3>
  <BB1, CC1, BB2, CC2, BB3, BB4, CC3, CC4>(o1: Op<DomNode<A, B, C>, DomNode<A, BB1, CC1>>, o2: Op<DomNode<A, BB1, CC1>, DomNode<A, BB2, CC2>>, o3: Op<DomNode<A, BB2, CC2>, DomNode<A, BB3, CC3>>, o4: Op<DomNode<A, BB3, CC3>, DomNode<A, BB4, CC4>>): NodeComposeFn<A, B & BB1 & BB2 & BB3 & BB4, C & CC1 & CC2 & CC3 & CC4>
  <BB1, CC1, BB2, CC2, BB3, BB4, CC3, CC4, BB5, CC5>(o1: Op<DomNode<A, B, C>, DomNode<A, BB1, CC1>>, o2: Op<DomNode<A, BB1, CC1>, DomNode<A, BB2, CC2>>, o3: Op<DomNode<A, BB2, CC2>, DomNode<A, BB3, CC3>>, o4: Op<DomNode<A, BB3, CC3>, DomNode<A, BB4, CC4>>, ...o5: Op<DomNode<A, any, any>, DomNode<A, BB5, CC5>>[]): NodeComposeFn<A, B & BB1 & BB2 & BB3 & BB4 & BB5, C & CC1 & CC2 & CC3 & CC4 & CC5>

  (...childrenSegment: NodeStream[]): NodeStream<A>
}

interface TextCompose {
  (input: string | Stream<string>): NodeStream<HTMLElement>
  (input: Op<DomNode<HTMLElement>, DomNode<HTMLElement>>): TextCompose
}

export class NodeSource<A extends NodeType, B, C, D> implements NodeStream<A, B, C> {
  constructor(
    private value: D,
    private op: Op<D, A>,
    private childNodes: NodeStream[] | []
  ) { }


  run(sink: Sink<DomNode<A, B, C>>, scheduler: Scheduler) {
    const nodeCreation = this.op(startWith(this.value, never()))
    const nodeSink = new NodeSourceSink(sink, this.childNodes, scheduler)
    const disposable = nodeCreation.run(nodeSink, scheduler)

    return disposeBoth(disposable, nodeSink)
  }
}

class NodeSourceSink<A extends NodeType, B, C> {
  disposable = disposeNone()

  constructor(
    public sink: Sink<DomNode<A, B, C>>,
    public childrenSegment: NodeStream<NodeType, any, any>[],
    public scheduler: Scheduler
  ) { }

  event(t: Time, node: A): void {
    this.disposable = disposeWith(n => n.remove(), node)

    this.sink.event(t, {
      element: node,
      childrenSegment: this.childrenSegment,
      slot: 0,
      segmentsSlot: [],
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



export const create = <A, B extends NodeType>(sourceOp: Op<A, B>, postOp: Op<DomNode<B>, DomNode<B>> = id) => (sourceOpValue: A): NodeComposeFn<B> => {
  return function nodeComposeFn(...input: ComposeInput<B>) {
    if (input.length === 0 || input.some(isStream)) {
      return postOp(
        new NodeSource(sourceOpValue, sourceOp, input.length ? input as NodeStream<B>[] : [never()])
      ) as any
    }

    // @ts-ignore
    const inputFinalOp: Op<DomNode<B>, DomNode<B>> = O(...input)

    return create(sourceOp, compose(inputFinalOp, postOp))(sourceOpValue)
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


export const $textFn = <B extends string>(postOp: Op<DomNode<HTMLElement>, DomNode<HTMLElement>> = O(x => x)): TextCompose => {
  return function textComp(input: TextCreationInput) {

    if (typeof input === 'string' || isStream(input)) {
      return postOp(new NodeSource<HTMLElement, any, B, any>(input, textOp, []))
    }

    return $textFn(O(input, postOp)) as any
  }
}


export const $svg = create(map(<K extends keyof SVGElementTagNameMap>(a: K) => document.createElementNS('http://www.w3.org/2000/svg', a)))
export const $element = create(map(<K extends keyof HTMLElementTagNameMap>(a: K) => document.createElement(a)))
export const $custom = create(map((a: string) => document.createElement(a)))
export const $node = $custom('node')
export const $text = $textFn(id)
export const $wrapNativeElement = create(map((rootNode: HTMLElement) => rootNode))

