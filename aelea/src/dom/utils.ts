import type { Scheduler, Stream } from '@most/types'
import type * as CSS from 'csstype'
import type { SettableDisposable } from './utils/SettableDisposable.js'

export type StyleCSS = CSS.Properties

export type IAttrProperties<T> = {
  [P in keyof T]: T[P]
}

export type IText = Stream<Text>
export type INodeElement = Node & ChildNode
export type IBranchElement = HTMLElement | SVGElement

export interface IElementConfig<B = {}> {
  style?: StyleCSS
  stylePseudo: Array<{ style: StyleCSS; class: string }>
  styleBehavior: Stream<StyleCSS | null>[]

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
