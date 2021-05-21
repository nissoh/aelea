
import * as CSS from 'csstype'
import { Scheduler, Stream } from '@most/types'
import { SettableDisposable } from './utils/SettableDisposable'

export type StyleCSS = CSS.Properties

export type IAttrProperties<T> = {
  [P in keyof T]: T[P]
}

export type IText = Stream<Text>
export type INodeElement = Node & ChildNode
export type IBranchElement = HTMLElement | SVGElement

export interface IElementConfig<B = {}> {
  style?: StyleCSS
  stylePseudo: Array<{ style: StyleCSS, class: string }>
  styleBehavior: Stream<StyleCSS | null>[]

  attributes?: IAttrProperties<B>
  attributesBehavior: Stream<IAttrProperties<B>>[]
}

export interface INode<A extends INodeElement = INodeElement> {
  element: A
  disposable: SettableDisposable
}

export interface IBranch<A extends IBranchElement = IBranchElement, B = {}> extends INode<A>, IElementConfig<B> {
  $segments: Array<$Node>
  insertAscending: boolean
}

export interface StyleEnvironment {
  cache: string[]
  namespace: string
  stylesheet: CSSStyleSheet
}

export interface RunEnvironment {
  rootNode: IBranchElement,
  style: StyleEnvironment,
  scheduler: Scheduler
}


export interface Tether<A, B> {
  (): Op<A, A>
  (o1: Op<A, B>): Op<A, A>
  <B1>(o1: Op<A, B1>, o2: Op<B1, B>): Op<A, A>
  <B1, B2>(o1: Op<A, B1>, o2: Op<B1, B2>, o3: Op<B2, B>): Op<A, A>
  <B1, B2, B3, B4>(o1: Op<A, B1>, o2: Op<B1, B2>, o3: Op<B2, B3>, o4: Op<B3, B4>): Op<A, A>
  <B1, B2, B3, B4, B5>(o1: Op<A, B1>, o2: Op<B1, B2>, o3: Op<B2, B3>, o4: Op<B3, B4>, o5: Op<B4, B5>): Op<A, A>
  <B1, B2, B3, B4, B5, B6>(o1: Op<A, B1>, o2: Op<B1, B2>, o3: Op<B2, B3>, o4: Op<B3, B4>, o5: Op<B5, B6>): Op<A, A>
  <B1, B2, B3, B4, B5, B6>(o1: Op<A, B1>, o2: Op<B1, B2>, o3: Op<B2, B3>, o4: Op<B3, B4>, o5: Op<B5, B6>, ...oos: Op<unknown, B>[]): Op<A, A>
}

export type $Branch<A extends IBranchElement = IBranchElement, B = {}> = Stream<IBranch<A, B>>
export type $Node<A extends INodeElement = INodeElement> = Stream<INode<A>>

export type Op<T, R> = (o: Stream<T>) => Stream<R>


export type Behavior<A, B = A> = [Stream<B>, Tether<A, B>]
