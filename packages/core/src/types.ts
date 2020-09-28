
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
  children: NodeStream<NodeType>[]
  slot: number
}

export type NodeStream<A extends NodeType = NodeType, B = {}, C = {}> = Stream<DomNode<A, B, C>>
export type ElementStream<A extends NodeType = NodeContainerType, B = {}, C = {}> = NodeStream<A, B, C>

export type Op<T, R> = (o: Stream<T>) => Stream<R>

export type Type<T extends Op<any, any>> = ReturnType<T> extends Stream<infer Z> ? Z : unknown



