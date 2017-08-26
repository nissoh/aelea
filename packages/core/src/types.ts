

import { Stream } from '@most/types'

export type NodeStreamLike = Stream<NodeStreamType | never>
export type NodeStreamType = Node

export interface Behavior<T> extends Stream<T> {
  sample <R> (event: Stream<any>): Stream<R>
}

export type Behaviors<K extends string, T> = {
    [P in K]: Behavior<T>
}

export type Actions<K extends string, T> = {
    [P in K]: (x: NodeStreamType) => Stream<T>
}

export type inputComposition<A, B> = (input: Stream<A>) => Stream<B>
