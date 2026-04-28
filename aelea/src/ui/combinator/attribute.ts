import type { IStream } from '../../stream/index.js'
import { curry2, map } from '../../stream/index.js'
import type { I$Node, IAttributeProperties } from '../types.js'

export const attr: IAttributeCurry = curry2((attrs, ns) =>
  map(node => {
    Object.assign(node.attributes, attrs)
    return node
  }, ns)
)

export const attrBehavior: IAttributeBehaviorCurry = curry2((attrs, node) => {
  return map(n => {
    n.attributesBehavior.push(attrs)
    return n
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
