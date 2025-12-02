import type { IStream } from '@/stream'
import { curry2, map } from '@/stream'
import type { I$Node, IAttributeProperties } from '../types.js'

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
  <A, TElement>(styleInput: IStream<IAttributeProperties<A> | null>, node: I$Node<TElement>): I$Node<TElement>
  <A, TElement>(styleInput: IStream<IAttributeProperties<A> | null>): (node: I$Node<TElement>) => I$Node<TElement>
}

export interface IAttributeCurry {
  <A, TElement>(attrs: IAttributeProperties<A>, node: I$Node<TElement>): I$Node<TElement>
  <A, TElement>(attrs: IAttributeProperties<A>): (node: I$Node<TElement>) => I$Node<TElement>
}
