import {curry2, CurriedFunction2} from '@most/prelude'
import {NodeStream} from '../types'
import {tap} from '@most/core'
import {Stream} from '@most/types'


export type IAttrProperties = {[key: string]: string}


const applyAttr = (attrs: IAttrProperties, node: HTMLElement) => {
  if (attrs) {
    Object.keys(attrs).forEach(attrKey => {
      node.setAttribute(attrKey, attrs[attrKey])
    })
  }

  return node
}

export const applyAttrCurry = curry2(applyAttr)


export function attr(attrs: IAttrProperties, ns: NodeStream): NodeStream {
  return tap(applyAttrCurry(attrs), ns)
}




export {CurriedFunction2, Stream}
