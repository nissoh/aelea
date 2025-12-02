import type { IStream } from '@/stream'
import { curry2, map } from '@/stream'
import type { I$Node, IAttributeProperties, INodeElement } from '../types.js'

export const attr: IAttributeCurry = curry2((attrs, ns) =>
  map(node => {
    node.attributes = { ...node.attributes, ...attrs }

    return node
  }, ns)
)

export const attrBehavior: IAttributeBehaviorCurry = curry2((attrs, node) => {
  return map(node => {
    node.attributesBehavior = [...node.attributesBehavior, attrs]

    return node
  }, node)
})

export interface IAttributeBehaviorCurry {
  <A, C extends INodeElement, D>(styleInput: IStream<IAttributeProperties<A> | null>, node: I$Node<C>): I$Node<C>
  <A, C extends INodeElement>(styleInput: IStream<IAttributeProperties<A> | null>): (node: I$Node<C>) => I$Node<C>
}

export interface IAttributeCurry {
  <A, B extends INodeElement>(attrs: IAttributeProperties<A>, node: I$Node<B>): I$Node<B>
  <A, B extends INodeElement>(attrs: IAttributeProperties<A>): (node: I$Node<B>) => I$Node<B>
}
