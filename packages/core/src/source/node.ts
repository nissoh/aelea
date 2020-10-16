import { Scheduler, Sink, Stream, Time } from '@most/types'
import { $ChildNode, Op, NodeChild, NodeContainerType, ContainerDomNode, NodeType, $Node } from '../types'
import { now, map, never, switchLatest, mergeArray } from '@most/core'
import { O, isFunction, Pipe, xForver, nullSink } from 'src/utils'
import { disposeBoth, disposeNone, disposeWith } from '@most/disposable'
import { compose, curry2, id } from '@most/prelude'
import { applyAttrFn } from 'src'



function appendToSlot(parent: ContainerDomNode<NodeContainerType>, child: NodeChild<NodeType>, insertAt: number) {
  if (insertAt === 0) {
    parent.element.prepend(child.element)
    return
  }

  parent.element.insertBefore(child.element, parent.element.children[insertAt])
}


export interface NodeComposeFn<TChildren, A extends NodeContainerType = NodeContainerType, B = {}, C = {}> {
  <BB1, CC1>(o1: Op<ContainerDomNode<A, B>, ContainerDomNode<A, BB1>>): NodeComposeFn<TChildren, A, B & BB1, C & CC1>
  <BB1, CC1, BB2, CC2>(o1: Op<ContainerDomNode<A, B>, ContainerDomNode<A, BB1>>, o2: Op<ContainerDomNode<A, BB1>, ContainerDomNode<A, BB1>>): NodeComposeFn<TChildren, A, B & BB1 & BB2, C & CC1 & CC2>
  <BB1, CC1, BB2, CC2, BB3, CC3>(o1: Op<ContainerDomNode<A, B>, ContainerDomNode<A, BB1>>, o2: Op<ContainerDomNode<A, BB1>, ContainerDomNode<A, BB1>>, o3: Op<ContainerDomNode<A, BB1>, ContainerDomNode<A, BB1>>): NodeComposeFn<TChildren, A, B & BB1 & BB2 & BB3, C & CC1 & CC2 & CC3>
  <BB1, CC1, BB2, CC2, BB3, BB4, CC3, CC4>(o1: Op<ContainerDomNode<A, B>, ContainerDomNode<A, BB1>>, o2: Op<ContainerDomNode<A, BB1>, ContainerDomNode<A, BB1>>, o3: Op<ContainerDomNode<A, BB1>, ContainerDomNode<A, BB1>>, o4: Op<ContainerDomNode<A, BB1>, ContainerDomNode<A, BB1>>): NodeComposeFn<TChildren, A, B & BB1 & BB2 & BB3 & BB4, C & CC1 & CC2 & CC3 & CC4>
  <BB1, CC1, BB2, CC2, BB3, BB4, CC3, CC4, BB5, CC5>(o1: Op<ContainerDomNode<A, B>, ContainerDomNode<A, BB1>>, o2: Op<ContainerDomNode<A, BB1>, ContainerDomNode<A, BB1>>, o3: Op<ContainerDomNode<A, BB1>, ContainerDomNode<A, BB1>>, o4: Op<ContainerDomNode<A, BB1>, ContainerDomNode<A, BB1>>, ...o5: Op<ContainerDomNode<A, any>, ContainerDomNode<A, BB1>>[]): NodeComposeFn<TChildren, A, B & BB1 & BB2 & BB3 & BB4 & BB5, C & CC1 & CC2 & CC3 & CC4 & CC5>

  (...childrenSegment: TChildren[]): $Node<A>
}


class NodeSource<A extends NodeType, B extends NodeChild<A>> implements $ChildNode<A> {
  constructor(private source: Stream<B>) { }

  run(sink: Sink<B>, scheduler: Scheduler) {
    const nodeSink = new NodeSourceSink(sink)
    const disposable = this.source.run(nodeSink, scheduler)
    return disposeBoth(disposable, nodeSink)
  }
}

class NodeSourceSink<A extends NodeType, B extends NodeChild<A>> extends Pipe<B, B> {
  disposable = disposeNone()

  event(t: Time, node: B): void {
    this.disposable = disposeWith(n => n.remove(), node.element)
    this.sink.event(t, node)
  }

  dispose() {
    this.disposable.dispose()
  }
}

export class NodeRenderSink<T extends NodeContainerType> extends Pipe<ContainerDomNode<T>, ContainerDomNode<T>> {

  disposable = disposeNone()
  childrenSegmentSink: NodeRenderSink<T>[] = []
  effectsDisposable = disposeNone()

  constructor(
    private parent: ContainerDomNode,
    private stylesheet: CSSStyleSheet,
    private scheduler: Scheduler,
    private csIndex: number,
    sink: Sink<ContainerDomNode<T>>
  ) {
    super(sink)
  }


  event(time: Time, node: ContainerDomNode<T>) {
    this.disposable = disposeWith(n => n.remove(), node.element)

    let insertAt = 0 // node.slot // asc order
    for (let i = 0; i < this.csIndex; i++) {
      insertAt = insertAt + this.parent.segmentsChildrenCount[i]
    }

    appendToSlot(this.parent, node, insertAt)

    this.parent.segmentsChildrenCount[this.csIndex]++

    if (node.childrenSegment) {
      this.childrenSegmentSink = node.childrenSegment.map(($child, csIndex) => {
        const csink = new NodeRenderSink(node, this.stylesheet, this.scheduler, csIndex, this.sink)
        const disp = $child.run(csink, this.scheduler)

        csink.disposable = disp

        return csink
      })

      this.effectsDisposable = mergeArray([
        ...node.style,
        ...node.attributes.map(s =>
          map(attrs => applyAttrFn(attrs, node.element), s)
        ),
      ])
        .run(nullSink, this.scheduler)
    }


    this.sink.event(time, node)
  }

  end(t: Time) {
    this.childrenSegmentSink.forEach(s => {
      s.end(t)
    })
    this.sink.end(t)

    this.dispose()
  }

  error(t: Time, err: any) {
    this.sink.error(t, err)
  }

  dispose() {
    this.parent.segmentsChildrenCount[this.csIndex]--
    this.effectsDisposable.dispose()
    this.disposable.dispose()
  }

}

export const createNodeSource = <A extends NodeType, B extends NodeChild<A>>(source: Stream<B>): $ChildNode<A> =>
  new NodeSource(source)

export function createNodeContainer(parent: ContainerDomNode<NodeContainerType>, stylesheet: CSSStyleSheet) {
  return {
    run(sink: Sink<ContainerDomNode<HTMLElement>>, scheduler: Scheduler) {

      const nodeSink = new NodeRenderSink(parent, stylesheet, scheduler, 0, sink)
      nodeSink.disposable = mergeArray(parent.childrenSegment).run(nodeSink, scheduler)

      return nodeSink
    }
  }
}

const createTextNodeSource = curry2((slot: number, text: string): $ChildNode<Text> =>
  createNodeSource(xForver({ element: document.createTextNode(text) }))
)


export const create = <A, B extends NodeContainerType>(sourceOp: Op<A, B>, postOp: Op<ContainerDomNode<B>, ContainerDomNode<B>> = id) => (sourceOpValue: A): NodeComposeFn<$ChildNode, B> => {
  return function nodeComposeFn(...input: any[]): any {
    if (input.some(isFunction)) {
      // @ts-ignore
      const inputFinalOp: Op<ContainerDomNode<B>, ContainerDomNode<B>> = O(...input)

      return create(sourceOp, compose(inputFinalOp, postOp))(sourceOpValue)
    }

    const childrenSegment = input.length ? input as $ChildNode<B>[] : [never()]
    const segmentsChildrenCount: number[] = Array(childrenSegment.length).fill(0)

    const createNodeOp = O(
      sourceOp,
      map(element => {
        return <ContainerDomNode<B>>{
          element,
          childrenSegment,
          segmentsChildrenCount,
          slot: 0,
          style: [],
          disposable: disposeNone(),
          attributes: []
        }
      })
    )

    return postOp(createNodeSource(createNodeOp(xForver(sourceOpValue))))
  }
}


export const $textFn = <A extends HTMLElement>(postOp: Op<ContainerDomNode<A>, ContainerDomNode<A>> = O(x => x)): NodeComposeFn<string | Stream<string>, A> => {
  return function textComp(...input: any[]) {

    if (input.some(isFunction)) {
      // @ts-ignore
      const inputFinalOp: Op<ContainerDomNode<A>, ContainerDomNode<A>> = O(...input)

      return $textFn(compose(inputFinalOp, postOp)) as any
    }

    const children: Stream<NodeChild<Text>>[] = input.map((x, slot) => {
      const strStream = typeof x === 'string' ? now(x) : x as Stream<string>

      return switchLatest(map(createTextNodeSource(slot), strStream))
    })

    return create(map(_ => document.createElement('text')), postOp)(null)(...children)
  }
}


export const $svg = create(map(<K extends keyof SVGElementTagNameMap>(a: K) => document.createElementNS('http://www.w3.org/2000/svg', a)))
export const $element = create(map(<K extends keyof HTMLElementTagNameMap>(a: K) => document.createElement(a)))
export const $custom = create(map((a: string) => document.createElement(a)))
export const $node = $custom('node')
export const $text = $textFn(id)
export const $wrapNativeElement = create(map((rootNode: HTMLElement) => rootNode))
