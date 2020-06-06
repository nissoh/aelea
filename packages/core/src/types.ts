

import {Stream} from '@most/types'
import {ProxyStream} from './behavior'
import * as CSS from 'csstype'


export type StyleCSS<T = HTMLElement> = {
  [P in keyof T]: T[P]
} & CSS.Properties<HTMLElement>

export type IAttrProperties<T> = {
  [P in keyof T]: T[P]
}

export type TextStream = Stream<Text>
export type NodeType = Node
export type ElementType = Element
export type DomNode<A extends NodeType = NodeType, B = {}, C = {}> = {
  node: A
  attributes: Stream<IAttrProperties<B>>
  style: Stream<StyleCSS<C>>
  children: NodeStream<A, unknown, unknown>
  slot: number
}

export type NodeStream<A extends NodeType = NodeType, B = {}, C = {}> = Stream<DomNode<A, B, C>>
export type ElementStream<A extends NodeType = ElementType, B = {}, C = {}> = NodeStream<A, B, C>

export type Op<T, R> = (o: Stream<T>) => Stream<R>

export type Type<T extends Op<any, any>> = ReturnType<T> extends Stream<infer Z> ? Z : unknown
export type Ref<T extends Op<any, any>> = ProxyStream<Type<T>>



export {Stream}
