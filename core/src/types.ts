
import * as CSS from 'csstype'
import { Scheduler, Stream } from '@most/types'
import SettableDisposable from './utils/SettableDisposable'

export type StyleCSS = CSS.Properties

export type IAttrProperties<T> = {
  [P in keyof T]: T[P]
}

export type IText = Stream<Text>
export type INodeElement = Node & ChildNode
export type IBranchElement = HTMLElement | SVGElement

export interface INode<A extends INodeElement = INodeElement> {
  element: A
  disposable: SettableDisposable
}
export interface IBranch<A extends IBranchElement = IBranchElement, B = {}> extends INode<A> {
  $segments: Array<$Node>
  insertAscending: boolean

  style?: StyleCSS
  stylePseudo: Array<{ style: StyleCSS, class: string }>
  attributes?: IAttrProperties<B>

  styleBehavior: Stream<StyleCSS | null>[]
  attributesBehavior: Stream<IAttrProperties<B>>[]
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


export interface Sample<A, B> {
  (): Sampler<A>
  (o1: Op<A, B>): Sampler<A>
  <B1>(o1: Op<A, B1>, o2: Op<B1, B>): Sampler<A>
  <B1, B2>(o1: Op<A, B1>, o2: Op<B1, B2>, o3: Op<B2, B>): Sampler<A>
  <B1, B2, B3, B4>(o1: Op<A, B1>, o2: Op<B1, B2>, o3: Op<B2, B3>, o4: Op<B3, B4>): Sampler<A>
  <B1, B2, B3, B4, B5>(o1: Op<A, B1>, o2: Op<B1, B2>, o3: Op<B2, B3>, o4: Op<B3, B4>, o5: Op<B4, B5>): Sampler<A>
  <B1, B2, B3, B4, B5, B6>(o1: Op<A, B1>, o2: Op<B1, B2>, o3: Op<B2, B3>, o4: Op<B3, B4>, o5: Op<B5, B6>): Sampler<A>
  <B1, B2, B3, B4, B5, B6>(o1: Op<A, B1>, o2: Op<B1, B2>, o3: Op<B2, B3>, o4: Op<B3, B4>, o5: Op<B5, B6>, ...oos: Op<unknown, B>[]): Sampler<A>
}

export type $Branch<A extends IBranchElement = IBranchElement, B = {}> = Stream<IBranch<A, B>>
export type $Node<A extends INodeElement = INodeElement> = Stream<INode<A>>

export type Op<T, R> = (o: Stream<T>) => Stream<R>

export type Sampler<A> = Op<A, A>

export type Behavior<A, B = A> = [Sample<A, B>, Stream<B>]
