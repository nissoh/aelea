import { map, mergeArray, never, now, switchLatest } from '@most/core'
import { disposeBoth, disposeNone, disposeWith } from '@most/disposable'
import { compose, curry2, id } from '@most/prelude'
import { Scheduler, Sink, Stream, Time } from '@most/types'
import { applyAttrFn } from '../combinators/attribute'
import { $ChildNode, $Node, NodeChild, NodeContainer, NodeContainerType, NodeType, Op } from '../types'
import { isFunction, nullSink, O, Pipe, xForver } from '../utils'



function appendToSlot(parent: NodeContainer<NodeContainerType>, child: NodeChild<NodeType>, insertAt: number) {
  if (insertAt === 0) {
    parent.element.prepend(child.element)
    return
  }

  parent.element.insertBefore(child.element, parent.element.children[insertAt])
}


export interface NodeComposeFn<TChildren, A extends NodeContainerType = NodeContainerType, B = {}, C = {}> {
  <BB1, CC1>(o1: Op<NodeContainer<A, B>, NodeContainer<A, BB1>>): NodeComposeFn<TChildren, A, B & BB1, C & CC1>
  <BB1, CC1, BB2, CC2>(o1: Op<NodeContainer<A, B>, NodeContainer<A, BB1>>, o2: Op<NodeContainer<A, BB1>, NodeContainer<A, BB1>>): NodeComposeFn<TChildren, A, B & BB1 & BB2, C & CC1 & CC2>
  <BB1, CC1, BB2, CC2, BB3, CC3>(o1: Op<NodeContainer<A, B>, NodeContainer<A, BB1>>, o2: Op<NodeContainer<A, BB1>, NodeContainer<A, BB1>>, o3: Op<NodeContainer<A, BB1>, NodeContainer<A, BB1>>): NodeComposeFn<TChildren, A, B & BB1 & BB2 & BB3, C & CC1 & CC2 & CC3>
  <BB1, CC1, BB2, CC2, BB3, BB4, CC3, CC4>(o1: Op<NodeContainer<A, B>, NodeContainer<A, BB1>>, o2: Op<NodeContainer<A, BB1>, NodeContainer<A, BB1>>, o3: Op<NodeContainer<A, BB1>, NodeContainer<A, BB1>>, o4: Op<NodeContainer<A, BB1>, NodeContainer<A, BB1>>): NodeComposeFn<TChildren, A, B & BB1 & BB2 & BB3 & BB4, C & CC1 & CC2 & CC3 & CC4>
  <BB1, CC1, BB2, CC2, BB3, BB4, CC3, CC4, BB5, CC5>(o1: Op<NodeContainer<A, B>, NodeContainer<A, BB1>>, o2: Op<NodeContainer<A, BB1>, NodeContainer<A, BB1>>, o3: Op<NodeContainer<A, BB1>, NodeContainer<A, BB1>>, o4: Op<NodeContainer<A, BB1>, NodeContainer<A, BB1>>, ...o5: Op<NodeContainer<A, unknown>, NodeContainer<A, BB1>>[]): NodeComposeFn<TChildren, A, B & BB1 & BB2 & BB3 & BB4 & BB5, C & CC1 & CC2 & CC3 & CC4 & CC5>

  (...childrenSegment: TChildren[]): $Node<A>
}


class NodeSource<A extends NodeType, B extends NodeChild<A>> implements $ChildNode<A> {
  constructor(private source: Stream<B>) { }

  run(sink: Sink<B>, scheduler: Scheduler) {
    const nodeSink = new NodeSourceSink(sink)
    const disposable = this.source.run(nodeSink, scheduler)
    return {
      dispose() {
        disposeBoth(disposable, nodeSink).dispose()
      }
    }
  }
}

class NodeSourceSink<A extends NodeType, B extends NodeChild<A>> extends Pipe<B, B> {
  disposable = disposeNone()

  event(t: Time, node: B): void {
    this.disposable = disposeWith(n => n.remove(), node.element)
    this.sink.event(t, node)
  }

  end(t: Time) {
    this.sink.end(t)
  }

  dispose() {
    this.disposable.dispose()
  }
}

export class NodeRenderSink<T extends NodeContainerType> extends Pipe<NodeContainer<T>, NodeContainer<T>> {

  disposable = disposeNone()
  childrenSegmentSink: NodeRenderSink<T>[] = []
  effectsDisposable = disposeNone()

  constructor(
    private node: NodeContainer,
    private stylesheet: CSSStyleSheet,
    private scheduler: Scheduler,
    private csIndex: number,
    sink: Sink<NodeContainer<T>>
  ) {
    super(sink)
  }


  event(time: Time, child: NodeContainer<T>) {
    this.disposable = disposeWith(n => n.remove(), child.element)

    let insertAt = 0 // node.slot // asc order
    for (let i = 0; i < this.csIndex; i++) {
      insertAt = insertAt + this.node.segmentsChildrenCount[i]
    }

    appendToSlot(this.node, child, insertAt)

    this.node.segmentsChildrenCount[this.csIndex]++

    if (child.childrenSegment) {
      this.childrenSegmentSink = child.childrenSegment.map(($child, csIndex) => {
        const csink = new NodeRenderSink(child, this.stylesheet, this.scheduler, csIndex, this.sink)
        const disp = $child.run(csink, this.scheduler)

        csink.disposable = disp

        return csink
      })

      this.effectsDisposable = mergeArray([
        ...child.style,
        ...child.attributes.map(s =>
          map(attrs => applyAttrFn(attrs, child.element), s)
        ),
      ])
        .run(nullSink, this.scheduler)
    }


    this.sink.event(time, child)
  }

  end(t: Time) {
    this.childrenSegmentSink.forEach(s => {
      s.end(t)
    })
    this.sink.end(t)
    this.dispose()

  }

  error(t: Time, err: Error) {
    this.sink.error(t, err)
  }

  dispose() {
    this.node.segmentsChildrenCount[this.csIndex]--
    this.effectsDisposable.dispose()
    this.disposable.dispose()
  }

}

export const createNodeSource = <A extends NodeType, B extends NodeChild<A>>(source: Stream<B>): $ChildNode<A> =>
  new NodeSource(source)

export function createNodeContainer(parent: NodeContainer<NodeContainerType>, stylesheet: CSSStyleSheet) {
  return {
    run(sink: Sink<NodeContainer<HTMLElement>>, scheduler: Scheduler) {

      const nodeSink = new NodeRenderSink(parent, stylesheet, scheduler, 0, sink)
      nodeSink.disposable = mergeArray(parent.childrenSegment).run(nodeSink, scheduler)

      return nodeSink
    }
  }
}

const createTextNodeSource = curry2((slot: number, text: string): $ChildNode<Text> =>
  createNodeSource(xForver({ element: document.createTextNode(text) }))
)


export const create = <A, B extends NodeContainerType>(sourceOp: Op<A, B>, postOp: Op<NodeContainer<B>, NodeContainer<B>> = id) => (sourceOpValue: A): NodeComposeFn<$ChildNode, B> => {
  return function nodeComposeFn(...input: any[]): any {
    if (input.some(isFunction)) {
      // @ts-ignore
      const inputFinalOp: Op<NodeContainer<B>, NodeContainer<B>> = O(...input)

      return create(sourceOp, compose(inputFinalOp, postOp))(sourceOpValue)
    }

    const childrenSegment = input.length ? input as $ChildNode<B>[] : [never()]
    const segmentsChildrenCount: number[] = Array(childrenSegment.length).fill(0)

    const createNodeOp = O(
      sourceOp,
      map(element => {
        return <NodeContainer<B>>{
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


export const $textFn = <A extends HTMLElement>(postOp: Op<NodeContainer<A>, NodeContainer<A>> = O(x => x)): NodeComposeFn<string | Stream<string>, A> => {
  return function textComp(...input: any[]) {

    if (input.some(isFunction)) {
      // @ts-ignore
      const inputFinalOp: Op<NodeContainer<A>, NodeContainer<A>> = O(...input)

      return $textFn(compose(inputFinalOp, postOp)) as any
    }

    const children: Stream<NodeChild<Text>>[] = input.map((x, slot) => {
      const strStream = typeof x === 'string' ? now(x) : x as Stream<string>

      return switchLatest(map(createTextNodeSource(slot), strStream))
    })

    return create(map(() => document.createElement('text')), postOp)(null)(...children)
  }
}


export const $svg = create(map(<K extends keyof SVGElementTagNameMap>(a: K) => document.createElementNS('http://www.w3.org/2000/svg', a)))
export const $element = create(map(<K extends keyof HTMLElementTagNameMap>(a: K) => document.createElement(a)))
export const $custom = create(map((a: string) => document.createElement(a)))
export const $node = $custom('node')
export const $text = $textFn(id)
export const $wrapNativeElement = create(map(<A extends NodeContainerType>(rootNode: A) => rootNode))
