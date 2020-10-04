
import * as CSS from 'csstype'
import { Stream } from '@most/types'

export type StyleCSS = CSS.Properties

export type IAttrProperties<T> = {
  [P in keyof T]: T[P]
}

export type TextStream = Stream<Text>
export type NodeType = Node & ChildNode
export type NodeContainerType = HTMLElement | SVGElement
export type DomNode<A extends NodeType = NodeType, B = {}, C = {}> = {
  element: A
  attributes: Stream<IAttrProperties<B>>[]
  style: Stream<string>[]
  childrenSegment: NodeStream[]
  segmentsSlot: number[],
  slot: number,
}


export interface Sample<A, B> {
  (): Sampler<A>
  (o1: Op<A, B>): Sampler<A>
  <B1>(o1: Op<A, B1>, o2: Op<B1, B>): Sampler<A>
  <B1, B2>(o1: Op<A, B1>, o2: Op<B1, B2>, o3: Op<B2, B>): Sampler<A>
  <B1, B2, B3>(o1: Op<A, B1>, o2: Op<B1, B2>, o3: Op<B2, B3>, o4: Op<B3, any>, ...oos: Op<any, B>[]): Sampler<A>
}

export type NodeStream<A extends NodeType = NodeType, B = {}, C = {}> = Stream<DomNode<A, B, C>>
export type ElementStream<A extends NodeType = NodeContainerType, B = {}, C = {}> = NodeStream<A, B, C>

export type Op<T, R> = (o: Stream<T>) => Stream<R>
export type OpType<T extends Op<any, any>> = ReturnType<T> extends Stream<infer Z> ? Z : unknown

export type Sampler<A> = Op<A, A>

export type Behavior<A, B> = [Sample<A, B>, Stream<B>]
export type StateBehavior<A, B> = [Sample<A, B>, Stream<B>]
