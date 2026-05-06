import { type IStream, map } from '../../stream/index.js'
import type { I$Node, IAttributeProperties, IMutator, INode } from '../types.js'
import { makeMutator } from './mutator.js'

export interface IAttributeCurry {
  <A, TElement>(attrs: IAttributeProperties<A>, node: I$Node<TElement>): I$Node<TElement>
  <A, TElement>(attrs: IAttributeProperties<A>): IMutator<TElement>
}

export interface IAttributeBehaviorCurry {
  <A, TElement>(stream$: IStream<IAttributeProperties<A> | null>, node: I$Node<TElement>): I$Node<TElement>
  <A, TElement>(stream$: IStream<IAttributeProperties<A> | null>): IMutator<TElement>
}

export const attr = ((attrs: IAttributeProperties<unknown>, source?: I$Node) => {
  const mutate = (node: INode) => {
    Object.assign(node.attributes, attrs)
    return node
  }
  if (source !== undefined) return map(mutate, source)
  return makeMutator(mutate)
}) as IAttributeCurry

export const attrBehavior = ((stream$: IStream<IAttributeProperties<unknown> | null>, source?: I$Node) => {
  const mutate = (node: INode) => {
    node.attributesBehavior.push(stream$)
    return node
  }
  if (source !== undefined) return map(mutate, source)
  return makeMutator(mutate)
}) as IAttributeBehaviorCurry
