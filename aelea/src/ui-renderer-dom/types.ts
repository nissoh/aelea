import type {
  I$Node,
  I$Op,
  I$Scheduler,
  I$Slottable,
  IComponentBehavior,
  INode,
  INodeCompose,
  IOutputTethers,
  ISlottable
} from '@/ui'

export type {
  I$Node,
  I$Op,
  I$Scheduler,
  I$Slottable,
  IComponentBehavior,
  INode,
  INodeCompose,
  INodeElement,
  IOutputTethers,
  ISlottable
} from '@/ui'

export type ISlottableElementDom = ChildNode
export type INodeElementDom = Node

export type I$SlottableDom = I$Slottable<ISlottableElementDom>
export type ISlottableDom = ISlottable<ISlottableElementDom>
export type INodeDom = INode<INodeElementDom>
export type I$NodeDom = I$Node<INodeElementDom>
export type I$OpDom = I$Op<INodeElementDom>
export type INodeComposeDom = INodeCompose<INodeElementDom>

export type I$SchedulerDom = I$Scheduler
export type IOutputTethersDom<A> = IOutputTethers<A>
export type IComponentBehaviorDom<T> = IComponentBehavior<T>
