import { map } from '@most/core'
import { curry2 } from '@most/prelude'
import { Stream } from '@most/types'
import { $Branch, IAttrProperties, IBranchElement } from '../types'

interface Attr {
  <A, B, C extends IBranchElement>(attrs: IAttrProperties<A>, ns: $Branch<C, B>): $Branch<C, A & B>
  <A, B, C extends IBranchElement>(attrs: IAttrProperties<A>): (ns: $Branch<C, B>) => $Branch<C, A & B>
}

interface AttrBehaviorCurry {
  <A, C extends IBranchElement, D>(styleInput: Stream<IAttrProperties<A> | null>, node: $Branch<C, D>): $Branch<C, D>
  <A, C extends IBranchElement, D>(styleInput: Stream<IAttrProperties<A> | null>): (node: $Branch<C, D>) => $Branch<C, D>
}


export const attr: Attr = curry2((attrs, source) =>
  map(ns => ({ ...ns, attributes: { ...ns.attributes, ...attrs } }), source)
)

export const attrBehavior: AttrBehaviorCurry = curry2((attrs, source) =>
  map(ns => ({ ...ns, attributesBehavior: [...ns.attributesBehavior, attrs] }), source)
)
