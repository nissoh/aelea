import type * as CSS from 'csstype'
import type { IOps, IScheduler, IStream, ITask, SettableDisposable } from '@/stream'

export type INodeElement = HTMLElement | SVGElement

export type IStyleCSS = CSS.Properties

export type IAttributeProperties<T> = {
  [P in keyof T]: string | number | boolean | null | undefined
}

export interface ITextNode {
  kind: 'text'
  value: string | IStream<string> | null
}

export interface ISlottable<A> {
  element: A
  disposable: SettableDisposable
}

export interface INode<A> extends ISlottable<A> {
  $segments: I$Slottable<A>[]
  style: IStyleCSS
  stylePseudo: Array<{ style: IStyleCSS; class: string }>
  styleBehavior: IStream<IStyleCSS | null>[]
  styleInline: IStream<IStyleCSS | null>[]
  propBehavior: Array<{ key: string; value: IStream<any> }>
  attributes: any
  attributesBehavior: IStream<any>[]
}

export type I$Slottable<TElement = unknown> = IStream<ISlottable<TElement>>

export type I$Node<T> = IStream<INode<T>>

export type I$Op<T> = IOps<INode<T>, INode<T>>

export interface INodeCompose<TElement = any> {
  (): I$Node<TElement>
  (op1: I$Op<TElement>, ...ops: I$Op<TElement>[]): INodeCompose<TElement>
  (...$leafs: Array<I$Slottable<any> | I$Node<any>>): I$Node<TElement>
}

export type I$Text<TElement = any> = IStream<ISlottable<TElement>>

export interface I$Scheduler extends IScheduler {
  paint(task: ITask): Disposable
}

export type IOutputTethers<A> = { [P in keyof A]?: IOps<A[P], A[P]> }

export type IComponentBehavior<T> = {
  [P in keyof T]: IStream<T[P]>
}
