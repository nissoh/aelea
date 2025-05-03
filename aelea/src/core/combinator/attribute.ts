import { map } from '@most/core'
import { curry2 } from '@most/prelude'
import type { Stream } from '@most/types'
import type { IBranchElement } from '../../core/types.js'
import type { $Branch } from '../source/node.js'

interface Attr {
  <A, B, C extends IBranchElement>(attrs: IAttrProperties<A>, ns: $Branch<C, B>): $Branch<C, A & B>
  <A, B, C extends IBranchElement>(attrs: IAttrProperties<A>): (ns: $Branch<C, B>) => $Branch<C, A & B>
}

interface AttrBehaviorCurry {
  <A, C extends IBranchElement, D>(styleInput: Stream<IAttrProperties<A> | null>, node: $Branch<C, D>): $Branch<C, D>
  <A, C extends IBranchElement, D>(
    styleInput: Stream<IAttrProperties<A> | null>
  ): (node: $Branch<C, D>) => $Branch<C, D>
}

export const attr: Attr = curry2((attrs, source) =>
  map((ns) => ({ ...ns, attributes: { ...ns.attributes, ...attrs } }), source)
)

export const attrBehavior: AttrBehaviorCurry = curry2((attrs, source) =>
  map((ns) => ({ ...ns, attributesBehavior: [...ns.attributesBehavior, attrs] }), source)
)
export type IAttrProperties<T> = {
  [P in keyof T]: T[P]
}
