import { map } from '@most/core'
import { curry2 } from '@most/prelude'
import type { Stream } from '@most/types'
import type { I$Node, INode, INodeElement } from '../source/node.js'

export type IAttributeProperties<T> = {
  [P in keyof T]: string | number | boolean | null | undefined
}

export interface IAttributeCurry {
  <A, B extends INodeElement>(attrs: IAttributeProperties<A>, node: I$Node<B>): I$Node<B>
  <A, B extends INodeElement>(attrs: IAttributeProperties<A>): (node: I$Node<B>) => I$Node<B>
}

export const attr: IAttributeCurry = curry2((attrs, node) =>
  map((node) => {
    const attributes = { ...node.attributes, ...attrs }

    return { ...node, attributes } as INode
  }, node)
)

export interface IAttributeBehaviorCurry {
  <A, C extends INodeElement, D>(styleInput: Stream<IAttributeProperties<A> | null>, node: I$Node<C>): I$Node<C>
  <A, C extends INodeElement>(styleInput: Stream<IAttributeProperties<A> | null>): (node: I$Node<C>) => I$Node<C>
}

export const attrBehavior: IAttributeBehaviorCurry = curry2((attrs, node) =>
  map((node) => {
    const attributesBehavior = { ...node.attributesBehavior, ...attrs }

    return { ...node, attributesBehavior } as INode
  }, node)
)
