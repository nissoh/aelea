import type { IOps, IScheduler, IStream, ITask } from '../stream/index.js'
import type { IAttributeProperties } from './combinator/attribute.js'
import type { IStyleCSS } from './combinator/style.js'
import type { SettableDisposable } from './utils/SettableDisposable.js'

// Re-export combinator types
export type { IAttributeProperties, IStyleCSS }

export type ISlottableElement = ChildNode
export type INodeElement = HTMLElement | SVGElement

export type I$Slottable<A extends ISlottableElement = ISlottableElement> = IStream<ISlottable<A>>

export interface ISlottable<A extends ISlottableElement = ISlottableElement> {
  element: A
  disposable: SettableDisposable
}

export interface INode<A extends INodeElement = INodeElement> extends ISlottable<A> {
  $segments: I$Slottable[]
  insertAscending: boolean
  style?: IStyleCSS
  stylePseudo: Array<{ style: IStyleCSS; class: string }>
  styleBehavior: IStream<IStyleCSS | null>[]

  attributes?: IAttributeProperties<any>
  attributesBehavior: IStream<IAttributeProperties<any>>[]
}

export type I$Node<A extends INodeElement = INodeElement> = IStream<INode<A>>

export type I$Op<TElement extends INodeElement = INodeElement> = (x: I$Node<TElement>) => I$Node<TElement>

export interface INodeCompose<TElement extends INodeElement = INodeElement> {
  // Empty call - returns node
  (): I$Node<TElement>
  // Compose operations (at least one)
  (op1: I$Op<TElement>, ...ops: I$Op<TElement>[]): INodeCompose<TElement>
  // Terminal operation - add children
  (...$leafs: I$Slottable[]): I$Node<TElement>
}

export interface I$Scheduler extends IScheduler {
  paint(task: ITask): Disposable
}

// Component types
export type IOutputTethers<A> = { [P in keyof A]?: IOps<A[P], A[P]> }

export type IComponentBehavior<T> = {
  [P in keyof T]: IStream<T[P]>
}
