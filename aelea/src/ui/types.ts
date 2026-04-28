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

/**
 * Minimal shape an aelea node factory populates. `element` holds an opaque
 * element descriptor the renderer materializes at mount. `disposable` is
 * per-instance lifecycle — set by the renderer to "remove this element";
 * fired by upstream stream teardown (e.g. `until`, `joinMap`'s `endInner`
 * on each concurrent inner, outer disposal) so segments that emit many
 * concurrent children (`joinMap(makeItem, list$)`) get per-child removal.
 */
export interface ISlottable<TElement = unknown> {
  element: TElement
  disposable: SettableDisposable
}

/**
 * A slot may emit `null` to request unmounting of any current content without
 * ending the outer slot stream. Used by router.match / router.contains to
 * clear content when a predicate flips false while keeping the stream alive.
 */
export type ISlotChild<TElement = unknown> = ITextNode | ISlottable<TElement> | null

export interface INode<TElement = unknown> extends ISlottable<TElement> {
  $segments: I$Slottable<TElement>[]
  style: IStyleCSS
  stylePseudo: Array<{ style: IStyleCSS; class: string }>
  styleBehavior: IStream<IStyleCSS | null>[]
  styleInline: IStream<IStyleCSS | null>[]
  propBehavior: Array<{ key: string; value: IStream<any> }>
  attributes: any
  attributesBehavior: IStream<any>[]
}

export type I$Slottable<TElement = unknown> = IStream<ISlotChild<TElement>>

export type I$Node<TElement = unknown> = IStream<INode<TElement>>

export type I$Op<TElement = unknown> = IOps<INode<TElement>, INode<TElement>>

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
