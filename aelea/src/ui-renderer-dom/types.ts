import type {
  I$Node as I$NodeBase,
  I$Op as I$OpBase,
  I$Scheduler as I$SchedulerBase,
  I$Slottable as I$SlottableBase,
  IComponentBehavior,
  INode as INodeBase,
  INodeCompose as INodeComposeBase,
  IOutputTethers,
  ISlottable as ISlottableBase
} from '@/ui'

export type ISlottableElementDom = Node
export type INodeElementDom = HTMLElement | SVGElement

export type I$SlottableDom<T extends ISlottableElementDom = ISlottableElementDom> = I$SlottableBase<T>
export type ISlottableDom<T extends ISlottableElementDom = ISlottableElementDom> = ISlottableBase<T>
export type INodeDom<T extends INodeElementDom = INodeElementDom> = INodeBase<T>
export type I$NodeDom<T extends INodeElementDom = INodeElementDom> = I$NodeBase<T>
export type I$OpDom<T extends INodeElementDom = INodeElementDom> = I$OpBase<T>
export type INodeComposeDom<T extends INodeElementDom = INodeElementDom> = INodeComposeBase<T>

export type I$Slottable<T extends ISlottableElementDom = ISlottableElementDom> = I$SlottableDom<T>
export type ISlottable<T extends ISlottableElementDom = ISlottableElementDom> = ISlottableDom<T>
export type INode<T extends INodeElementDom = INodeElementDom> = INodeDom<T>
export type I$Node<T extends INodeElementDom = INodeElementDom> = I$NodeDom<T>
export type I$Op<T extends INodeElementDom = INodeElementDom> = I$OpDom<T>
export type INodeCompose<T extends INodeElementDom = INodeElementDom> = INodeComposeDom<T>
export type INodeElement = INodeElementDom

export type I$SchedulerDom = I$SchedulerBase
export type I$Scheduler = I$SchedulerDom
export type IOutputTethersDom<A> = IOutputTethers<A>
export type IComponentBehaviorDom<T> = IComponentBehavior<T>
export type { IAttributeProperties, IStyleCSS, ITextNode } from '@/ui'
