import { map } from '@most/core'
import { curry2 } from '@most/prelude'
import type { Stream } from '@most/types'
import type { I$Branch, IBranchElement } from '../source/node.js'

export type IAttributeProperties<T> = {
  [P in keyof T]: string | number | boolean | null | undefined
}

export interface IAttributeCurry {
  <A, B, C extends IBranchElement>(attrs: IAttributeProperties<A>, ns: I$Branch<C, B>): I$Branch<C, A & B>
  <A, B, C extends IBranchElement>(attrs: IAttributeProperties<A>): (ns: I$Branch<C, B>) => I$Branch<C, A & B>
}

export interface IAttributeBehaviorCurry {
  <A, C extends IBranchElement, D>(
    styleInput: Stream<IAttributeProperties<A> | null>,
    node: I$Branch<C, D>
  ): I$Branch<C, D>
  <A, C extends IBranchElement, D>(
    styleInput: Stream<IAttributeProperties<A> | null>
  ): (node: I$Branch<C, D>) => I$Branch<C, D>
}

export const attr: IAttributeCurry = curry2((attrs, source) =>
  map((ns) => ({ ...ns, attributes: { ...ns.attributes, ...attrs } }), source)
)

export const attrBehavior: IAttributeBehaviorCurry = curry2((attrs, source) =>
  map((ns) => ({ ...ns, attributesBehavior: [...ns.attributesBehavior, attrs] }), source)
)
