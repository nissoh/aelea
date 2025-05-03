import type { Scheduler, Stream } from '@most/types'
import type * as CSS from 'csstype'
import type { Ops } from '../core/types.js'
import type { SettableDisposable } from './utils/SettableDisposable.js'

export type IStyleCSS = CSS.Properties

export type IAttrProperties<T> = {
  [P in keyof T]: T[P]
}

export type INodeElement = Node & ChildNode
export type IBranchElement = HTMLElement | SVGElement

export interface IElementConfig<B = {}> {
  style?: IStyleCSS
  stylePseudo: Array<{ style: IStyleCSS; class: string }>
  styleBehavior: Stream<IStyleCSS | null>[]

  attributes?: IAttrProperties<B>
  attributesBehavior: Stream<IAttrProperties<B>>[]
}

export interface INode<A extends INodeElement = INodeElement> {
  element: A
  disposable: SettableDisposable
}

export interface IBranch<A extends IBranchElement = IBranchElement, B = {}> extends INode<A>, IElementConfig<B> {
  $segments: $Node[]
  insertAscending: boolean
}

export interface StyleEnvironment {
  cache: string[]
  namespace: string
  stylesheet: CSSStyleSheet
}

export interface RunEnvironment {
  rootNode: IBranchElement
  style: StyleEnvironment
  scheduler: Scheduler
}

export type $Branch<A extends IBranchElement = IBranchElement, B = {}> = Stream<IBranch<A, B>>
export type $Node<A extends INodeElement = INodeElement> = Stream<INode<A>>

export interface IComposeOrSeed<TChildren, A extends IBranchElement = IBranchElement, B = {}, C = {}> {
  <BB1, CC1>(o1: Ops<IBranch<A, B>, IBranch<A, BB1>>): IComposeOrSeed<TChildren, A, B & BB1, C & CC1>
  <BB1, CC1, BB2, CC2>(
    o1: Ops<IBranch<A, B>, IBranch<A, BB1>>,
    o2: Ops<IBranch<A, BB1>, IBranch<A, BB1>>
  ): IComposeOrSeed<TChildren, A, B & BB1 & BB2, C & CC1 & CC2>
  <BB1, CC1, BB2, CC2, BB3, CC3>(
    o1: Ops<IBranch<A, B>, IBranch<A, BB1>>,
    o2: Ops<IBranch<A, BB1>, IBranch<A, BB1>>,
    o3: Ops<IBranch<A, BB1>, IBranch<A, BB1>>
  ): IComposeOrSeed<TChildren, A, B & BB1 & BB2 & BB3, C & CC1 & CC2 & CC3>
  <BB1, CC1, BB2, CC2, BB3, BB4, CC3, CC4>(
    o1: Ops<IBranch<A, B>, IBranch<A, BB1>>,
    o2: Ops<IBranch<A, BB1>, IBranch<A, BB1>>,
    o3: Ops<IBranch<A, BB1>, IBranch<A, BB1>>,
    o4: Ops<IBranch<A, BB1>, IBranch<A, BB1>>
  ): IComposeOrSeed<TChildren, A, B & BB1 & BB2 & BB3 & BB4, C & CC1 & CC2 & CC3 & CC4>
  <BB1, CC1, BB2, CC2, BB3, BB4, CC3, CC4, BB5, CC5>(
    o1: Ops<IBranch<A, B>, IBranch<A, BB1>>,
    o2: Ops<IBranch<A, BB1>, IBranch<A, BB1>>,
    o3: Ops<IBranch<A, BB1>, IBranch<A, BB1>>,
    o4: Ops<IBranch<A, BB1>, IBranch<A, BB1>>,
    ...o5: Ops<IBranch<A, unknown>, IBranch<A, BB1>>[]
  ): IComposeOrSeed<TChildren, A, B & BB1 & BB2 & BB3 & BB4 & BB5, C & CC1 & CC2 & CC3 & CC4 & CC5>

  (...$childrenSegment: TChildren[]): $Branch<A>
}
