import { curry2 } from '@most/prelude'
import { ElementType, IAttrProperties, ElementStream, Stream, DomNode } from '../types'
import { map, merge } from '@most/core'
import { Scheduler, Disposable, Sink } from '@most/types'


interface Attr {
  <A, B, C extends ElementType, D>(attrs: Stream<IAttrProperties<A>> | IAttrProperties<A>): (ns: ElementStream<C, B, D>) => ElementStream<C, A & B, C>
  <A, B, C extends ElementType, D>(attrs: Stream<IAttrProperties<A>> | IAttrProperties<A>, ns: ElementStream<C, B, D>): ElementStream<C, A & B, C>
}

interface ApplyAttr {
  <A extends ElementType, B>(attrs: IAttrProperties<B>): (ns: A) => A
  <A extends ElementType, B>(attrs: IAttrProperties<B>, ns: A): A
}



export const applyAttrCurry: ApplyAttr = curry2((attrs: any, node) => {
  if (attrs) {
    Object.keys(attrs).forEach(attrKey => {
      node.setAttribute(attrKey, attrs[attrKey])
    })
  }

  return node
})


class AttributeSource<A, B, C extends ElementType, D> implements ElementStream<C, D, A & B> {

  constructor(public attrs: IAttrProperties<D>, public source: ElementStream<C, D, A & B>) { }

  run(sink: Sink<DomNode<C, D, A & B>>, scheduler: Scheduler): Disposable {

    return map(ns => {
      return {
        ...ns,
        attributes: map(newStyle => ({ ...newStyle, ...this.attrs }), ns.style)
      }
    }, this.source).run(sink, scheduler)
  }

}

export const attr: Attr = curry2((attrsInput, source) => {
  // pretty hacky.. kinda
  if ((<any>attrsInput).run) {
    return map(dn => {
      const styleStream = map(styleObj => styleObj, attrsInput as Stream<IAttrProperties<unknown>>)
      return {
        ...dn,
        attributes: merge(dn.attributes, styleStream
        )
      }
    }, source)
  }

  if (source instanceof AttributeSource) {
    return new AttributeSource({ ...source.attrs, ...attrsInput }, source.source)
  }

  return new AttributeSource(attrsInput as IAttrProperties<unknown>, source)
})


