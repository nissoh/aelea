import { map } from '../../stream/index.js'
import type { I$Op, INode, INodeElement } from '../source/node.js'

export type IAttributeProperties<T> = {
  [P in keyof T]: string | number | boolean | null | undefined
}

export const attr = <A, B extends INodeElement>(attrs: IAttributeProperties<A>): I$Op<B> =>
  map((node) => {
    const attributes = { ...node.attributes, ...attrs }

    return { ...node, attributes } as INode
  })

export const attrBehavior = <A, B extends INodeElement>(attrs: IAttributeProperties<A>): I$Op<B> =>
  map((node) => {
    const attributesBehavior = [...node.attributesBehavior, attrs]

    return { ...node, attributesBehavior }
  })
