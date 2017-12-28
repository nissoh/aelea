

import { Stream } from '@most/types'

export type NodeStream = Stream<NodeType | never>
export type TextStream = Stream<Text | never>
export type DomStream = Stream<DomType>
export type DomType = Text | NodeType
export type NodeType = HTMLElement

export interface Behavior<T> extends Stream<T> {
  sample <R> (event: Stream<any>): Stream<R>
}

export type Behaviors<K extends string, T> = {
    [P in K]: Behavior<T>
}

export type Actions<K extends string, T> = {
    [P in K]: (x: NodeType) => Stream<T>
}

export type inputComposition<A, B> = (input: Stream<A>) => Stream<B>
