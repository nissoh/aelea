import { curry2 } from '@most/prelude'
import { NodeContainerType, IAttrProperties, $Node, ContainerDomNode } from '../types'
import { map, now } from '@most/core'
import { Scheduler, Disposable, Sink, Stream } from '@most/types'
import { isStream } from 'src/utils'


interface Attr {
  <A, B, C extends NodeContainerType, D>(attrs: Stream<IAttrProperties<A> | null> | IAttrProperties<A>, ns: $Node<C, B>): $Node<C, A & B>
  <A, B, C extends NodeContainerType, D>(attrs: Stream<IAttrProperties<A> | null> | IAttrProperties<A>): (ns: $Node<C, B>) => $Node<C, A & B>
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

class AttributeSource<A, B, C extends NodeContainerType, D> implements $Node<C, A & B> {

  constructor(public attrs: Stream<IAttrProperties<A> | null> | IAttrProperties<A>, public source: $Node<C, A & B>) { }

  run(sink: Sink<ContainerDomNode<C, A & B>>, scheduler: Scheduler): Disposable {

    const attrsStream = isStream(this.attrs) ? this.attrs : now(this.attrs)

    return map(ns =>
      ({ ...ns, attributes: [...ns.attributes, attrsStream] }),
      this.source
    ).run(sink, scheduler)
  }

}

export const attr: Attr = curry2((attrsInput, source) => {

  if (isStream(attrsInput)) {
    return new AttributeSource(attrsInput, source)
  }

  if (source instanceof AttributeSource) {
    return new AttributeSource({ ...source.attrs, ...attrsInput }, source.source)
  }

  return new AttributeSource(attrsInput, source)
})
