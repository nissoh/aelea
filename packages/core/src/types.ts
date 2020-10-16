
import * as CSS from 'csstype'
import { Disposable, Stream } from '@most/types'

export type StyleCSS = CSS.Properties

export type IAttrProperties<T> = {
  [P in keyof T]: T[P]
}

export type TextStream = Stream<Text>
export type NodeType = Node & ChildNode
export type NodeContainerType = HTMLElement | SVGElement

export interface NodeChild<A extends NodeType = NodeType> {
  // origin: B,

  element: A
  slot: number
  disposable: Disposable
}

export interface ContainerDomNode<A extends NodeContainerType = NodeContainerType, B = {}> extends NodeChild<A> {
  childrenSegment: $ChildNode[]
  segmentsChildrenCount: number[],

  style: Stream<string>[]
  attributes: Stream<IAttrProperties<B>>[]
}


export interface Sample<A, B> {
  (): Sampler<A>
  (o1: Op<A, B>): Sampler<A>
  <B1>(o1: Op<A, B1>, o2: Op<B1, B>): Sampler<A>
  <B1, B2>(o1: Op<A, B1>, o2: Op<B1, B2>, o3: Op<B2, B>): Sampler<A>
  <B1, B2, B3>(o1: Op<A, B1>, o2: Op<B1, B2>, o3: Op<B2, B3>, o4: Op<B3, any>, ...oos: Op<any, B>[]): Sampler<A>
}

export type $Node<A extends NodeContainerType = NodeContainerType, B = {}> = Stream<ContainerDomNode<A, B>>
export type $ChildNode<A extends NodeType = NodeType> = Stream<NodeChild<A>>

export type Op<T, R> = (o: Stream<T>) => Stream<R>
export type OpType<T extends Op<any, any>> = ReturnType<T> extends Stream<infer Z> ? Z : unknown

export type Sampler<A> = Op<A, A>

export type Behavior<A, B> = [Sample<A, B>, Stream<B>]
export type StateBehavior<A, B> = [Sample<A, B>, Stream<B>]
