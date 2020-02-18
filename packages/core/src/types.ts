

import {Stream} from '@most/types'
import {SplitBehavior} from './behavior'
import * as CSS from 'csstype'


export type StyleObj<T> = {
  [K in keyof T]: T[K]
} & CSS.Properties<HTMLElement>

export type TextStream = Stream<Text>
export type NodeType = Node
export type ElementType = HTMLElement
export type DomNode<A extends NodeType, B, C> = {
  node: A
  behavior: Stream<B>
  style: Stream<StyleObj<C>>
  children: NodeStream<any, any, any>
  slot: number
}


// export type NodeStream<T extends NodeType> = Stream<T>
export type NodeStream<A extends NodeType, B, C> = Stream<DomNode<A, B, C>>
export type ElementStream<A extends ElementType, B, C> = NodeStream<A, B, C>


export type Op<T, R> = (o: Stream<T>) => Stream<R>
export type FuncA2<A, B, C> = (a: A, b: B) => C


export type ComponentNode<A extends NodeType, B, Style = {}> = DomNode<A, B, Style>

export type ComponentActions<A, N extends NodeType> = {
  [P in keyof A]: Op<A[P], A[P]>
}




export {Stream}
