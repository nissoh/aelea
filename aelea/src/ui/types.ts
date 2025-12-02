import type * as CSS from 'csstype'
import type { IOps, IScheduler, IStream, ITask, SettableDisposable } from '@/stream'

export type NodeKind = 'element' | 'custom' | 'node' | 'svg' | 'wrap'

export type INodeElement<T = any> = T

export type IStyleCSS = CSS.Properties

export type IAttributeProperties<T> = {
  [P in keyof T]: string | number | boolean | null | undefined
}

export type DeclarationMap<TElement> = {
  element: (tag: string) => TElement
  custom: (tag: string) => TElement
  node: () => TElement
  svg: (tag: string) => TElement
  wrap: <A extends TElement>(element: A) => A
  text?: (value: string) => TElement
  setText?: (element: TElement, value: string) => void
}

export interface ISlottable<TElement = any> {
  element: TElement
  disposable: SettableDisposable
}

export interface INode<TElement = any> extends ISlottable<TElement> {
  kind: NodeKind
  tag: string | null
  $segments: I$Slottable<TElement>[]
  insertAscending: boolean
  style: IStyleCSS
  stylePseudo: Array<{ style: IStyleCSS; class: string }>
  styleBehavior: IStream<IStyleCSS>[]
  styleInline: IStream<IStyleCSS>[]

  attributes: any
  attributesBehavior: IStream<any>[]
}

export type I$Slottable<TElement = any> = IStream<ISlottable<TElement>>

export type I$Node<TElement = any> = IStream<INode<TElement>>

export type I$Op<TElement = any> = (x: I$Node<TElement>) => I$Node<TElement>

export interface INodeCompose<TElement = any> {
  (): I$Node<TElement>
  (op1: I$Op<TElement>, ...ops: I$Op<TElement>[]): INodeCompose<TElement>
  (...$leafs: Array<I$Slottable<TElement> | I$Node<TElement>>): I$Node<TElement>
}

export type I$Text<TElement = any> = IStream<ISlottable<TElement>>

export interface I$Scheduler extends IScheduler {
  paint(task: ITask): Disposable
}

export type IOutputTethers<A> = { [P in keyof A]?: IOps<A[P], A[P]> }

export type IComponentBehavior<T> = {
  [P in keyof T]: IStream<T[P]>
}
