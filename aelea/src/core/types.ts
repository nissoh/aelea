import type { Disposable, Stream } from '@most/types'

export type IText = Stream<Text>
export type INodeElement = Node & ChildNode
export type IBranchElement = HTMLElement | SVGElement

export interface ISettableDisposable extends Disposable {
  set: (disposable: Disposable) => void
}

export interface INode<A extends INodeElement = INodeElement> {
  element: A
  disposable: ISettableDisposable
}

export type Fn<T, R> = (a: T) => R

export type IOps<I, O> = Fn<Stream<I>, Stream<O>>
