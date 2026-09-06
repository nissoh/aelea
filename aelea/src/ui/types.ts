import type * as CSS from 'csstype'
import type { IOps, IScheduler, ISchedulerStats, IStream, ITask } from '../stream/index.js'
import type { IMountPort } from './mount.js'

export type IStyleCSS = CSS.Properties

export type IAttributes = Record<string, string | number | boolean | null | undefined>

export type IAttributeProperties<T> = {
  [P in keyof T]: string | number | boolean | null | undefined
}

export interface IElementDescriptor {
  tag: string
  namespace: 'html' | 'svg'
  /** A pre-existing element to adopt instead of creating one (`$wrapNativeElement`). */
  native?: unknown
}

export interface IStaticStyleEntry {
  pseudo: string | null
  style: IStyleCSS
  className?: string
}

/**
 * An imperative effect against a mounted element. Declared through a method
 * signature so a recipe stays assignable across element types.
 */
export type IEffect<TElement = unknown> = {
  bivariant(element: TElement, scheduler: I$Scheduler): Disposable | void
}['bivariant']

/**
 * Everything a compose expression fixes about a node before it is subscribed:
 * shared by every instance the compose emits, and by the static fast path.
 */
export interface IRecipe<TElement = unknown> {
  element: IElementDescriptor
  $segments: I$Slottable<TElement>[]
  staticStyles: IStaticStyleEntry[]
  styleBehavior: IStream<IStyleCSS | null>[]
  attributes: IAttributes
  attributesBehavior: IStream<IAttributes | null>[]
  propBehavior: { key: string; value: IStream<unknown> }[]
  effects: IEffect<TElement>[]
}

/**
 * One subscription's instance of a recipe: the port that resolves to its
 * element on mount, and the handle the renderer sets so disposing the
 * subscription removes the mounted child.
 */
/**
 * The renderer sets the mounted entry once; disposing the instance's
 * subscription then removes it. A second set is a double mount and throws.
 */
export interface IInstanceHandle extends Disposable {
  set(disposable: Disposable): void
}

export interface INode<TElement = unknown> {
  kind: 'node'
  recipe: IRecipe<TElement>
  mount: IMountPort<TElement>
  disposable: IInstanceHandle
}

export interface ITextNode {
  kind: 'text'
  value: string | IStream<string>
  disposable: IInstanceHandle
}

export type ISlottable<TElement = unknown> = INode<TElement> | ITextNode

export type ISlotChild<TElement = unknown> = ISlottable<TElement> | null

export type I$Slottable<TElement = unknown> = IStream<ISlotChild<TElement>>

export type I$Node<TElement = unknown> = IStream<INode<TElement>>

export type I$Text = IStream<ITextNode>

export type I$Op<TElement = unknown> = IOps<INode<TElement>, INode<TElement>>

export interface IMutator<TElement = unknown> {
  (source: I$Node<TElement>): I$Node<TElement>
  __mutate: (recipe: IRecipe<TElement>) => void
}

export interface INodeCompose<TElement = any> {
  (): I$Node<TElement>
  (op1: I$Op<TElement>, ...ops: I$Op<TElement>[]): INodeCompose<TElement>
  (...$leafs: Array<I$Slottable<any> | I$Node<any>>): I$Node<TElement>
}

export interface I$Scheduler extends IScheduler {
  paint(task: ITask): Disposable
  stats?(): ISchedulerStats
}

export type IOutputTethers<A> = { [P in keyof A]?: IOps<A[P], A[P]> }

export type IComponentBehavior<T> = {
  [P in keyof T]: IStream<T[P]>
}
