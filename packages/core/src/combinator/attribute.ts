import { curry2 } from '@most/prelude'
import { NodeContainerType, IAttrProperties, ElementStream, DomNode } from '../types'
import { map, now } from '@most/core'
import { Scheduler, Disposable, Sink, Stream } from '@most/types'
import { isStream } from 'src/utils'


interface Attr {
  <A, B, C extends NodeContainerType, D>(attrs: Stream<IAttrProperties<A> | null> | IAttrProperties<A>): (ns: ElementStream<C, B, D>) => ElementStream<C, A & B, C>
  <A, B, C extends NodeContainerType, D>(attrs: Stream<IAttrProperties<A> | null> | IAttrProperties<A>, ns: ElementStream<C, B, D>): ElementStream<C, A & B, C>
}


export function applyAttrFn(attrs: IAttrProperties<unknown>, node: NodeContainerType) {
  if (attrs) {
      Object.entries(attrs).forEach(([attrKey, value]) => {
          if (value) {
              node.setAttribute(attrKey, String(value))
          } else {
              node.removeAttribute(attrKey)
          }
      })
  }

  return node
}

class AttributeSource<A, B, C extends NodeContainerType, D> implements ElementStream<C, D, A & B> {

  constructor(public attrs: Stream<IAttrProperties<A> | null> | IAttrProperties<A>, public source: ElementStream<C, D, A & B>) { }

  run(sink: Sink<DomNode<C, D, A & B>>, scheduler: Scheduler): Disposable {

    const attrsStream = 'run' in this.attrs ? this.attrs : now(this.attrs)

    return map(ns =>
      ({ ...ns, attributes: [...ns.attributes, attrsStream] }),
      this.source
    ).run(sink, scheduler)
  }

}

export const attr: Attr = curry2((attrsInput, source) => {

  if (source instanceof AttributeSource && !isStream(attrsInput)) {
    return new AttributeSource({ ...source.attrs, ...attrsInput }, source.source)
  }

  return new AttributeSource(attrsInput as IAttrProperties<unknown>, source)
})
