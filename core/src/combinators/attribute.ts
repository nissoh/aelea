import { map } from '@most/core'
import { curry2 } from '@most/prelude'
import { Stream } from '@most/types'
import { $Branch, IAttrProperties, IBranchElement } from '../types'

interface Attr {
  <A, B, C extends IBranchElement>(attrs: Stream<IAttrProperties<A> | null> | IAttrProperties<A>, ns: $Branch<C, B>): $Branch<C, A & B>
  <A, B, C extends IBranchElement>(attrs: Stream<IAttrProperties<A> | null> | IAttrProperties<A>): (ns: $Branch<C, B>) => $Branch<C, A & B>
}

export const attr: Attr = curry2((attrs, source) => {
  return map(ns => ({ ...ns, attributes: { ...ns.attributes, ...attrs } }), source)
})
