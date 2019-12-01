

import { Stream } from '@most/types'

export type NodeStream = Stream<NodeType | never>
export type TextStream = Stream<Text | never>
export type DomStream = Stream<NodeType>
export type NodeType =  Node
export type Func<A, B> = (input: A) => B
export type FuncComp<A, B> = Func<Stream<A>, Stream<B>>

export interface Behavior<T, R> extends Stream<T> {
  attach (event: Stream<R>): Stream<R>
}

export type ComponentBehaviors<T, K extends keyof T> = {
  [P in K]: Behavior<T[P], HTMLElement>
}

export type ComponentActions<T, K extends keyof T> = {
    [P in K]: Func<HTMLElement, Stream<T[P]>>
}


export { Stream }
