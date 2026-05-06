import type * as CSS from 'csstype'
import type { IOps, IScheduler, IStream, ITask } from '../stream/index.js'
import type { SettableDisposable } from '../stream/utils/SettableDisposable.js'

export type IStyleCSS = CSS.Properties

export type IAttributeProperties<T> = {
  [P in keyof T]: string | number | boolean | null | undefined
}

export interface ITextNode {
  kind: 'text'
  value: string | IStream<string> | null
}

export interface ISlottable<TElement = unknown> {
  element: TElement
  disposable: SettableDisposable
}

export type ISlotChild<TElement = unknown> = ITextNode | ISlottable<TElement> | null

export interface IStaticStyleEntry {
  pseudo: string | null
  style: IStyleCSS
}

export interface INode<TElement = unknown> extends ISlottable<TElement> {
  $segments: I$Slottable<TElement>[]
  staticStyles: IStaticStyleEntry[]
  styleBehavior: IStream<IStyleCSS | null>[]
  styleInline: IStream<IStyleCSS | null>[]
  propBehavior: Array<{ key: string; value: IStream<any> }>
  attributes: any
  attributesBehavior: IStream<any>[]
}

export type I$Slottable<TElement = unknown> = IStream<ISlotChild<TElement>>

export type I$Node<TElement = unknown> = IStream<INode<TElement>>

export type I$Op<TElement = unknown> = IOps<INode<TElement>, INode<TElement>>

export interface IMutator<TElement = unknown> {
  (source: I$Node<TElement>): I$Node<TElement>
  __mutate: (node: INode<TElement>) => INode<TElement>
}

export interface INodeCompose<TElement = any> {
  (): I$Node<TElement>
  (op1: I$Op<TElement>, ...ops: I$Op<TElement>[]): INodeCompose<TElement>
  (...$leafs: Array<I$Slottable<any> | I$Node<any>>): I$Node<TElement>
}

export type I$Text = IStream<ITextNode>

export interface I$Scheduler extends IScheduler {
  paint(task: ITask): Disposable
}

export type IOutputTethers<A> = { [P in keyof A]?: IOps<A[P], A[P]> }

export type IComponentBehavior<T> = {
  [P in keyof T]: IStream<T[P]>
}
