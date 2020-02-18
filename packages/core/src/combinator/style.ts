import {Stream, Sink, Scheduler, Disposable} from '@most/types'
import {ElementStream, ElementType, DomNode, StyleObj} from '../types'

import * as CSS from 'csstype'
import {map, merge} from '@most/core'



export const applyStyle = (style: Partial<CSS.Properties<any>>, el: HTMLElement) => {
  let prop: any

  const elementStyle = el.style
  for (prop in style) {
    elementStyle[prop] = (<any>style)[prop]
  }
  return el
}


interface Style {
  <A extends ElementType, B, C, D>(style: StyleObj<D>): (node: ElementStream<A, B, C>, behavior?: Stream<any>) => ElementStream<A, B, C & D>
  <A extends ElementType, B, C, D>(style: StyleObj<D>, node: ElementStream<A, B, C>, behavior?: Stream<any>): ElementStream<A, B, C & D>
}


export const style: Style = (function styleFn <A extends ElementType, B, C, D>(style: StyleObj<D>, source: ElementStream<A, B, C>, behavior: Stream<any> | null = null) {
  if (arguments.length === 1) {
    return (source: any, behavior: any) => styleFn(style, source, behavior)
  }
  if (behavior) {
    return map(dn => {
      return {...dn, style: merge(dn.style, map(() => style, behavior))}
    }, source)
  }

  if (source instanceof StyleSource) {
    return new StyleSource({...source.style, ...style}, source.source)
  }

  return new StyleSource(style, source as any)
}) as any

class StyleSource<A extends ElementType, B extends ElementType, C, D> implements ElementStream<A, B, C & D> {

  constructor(public style: StyleObj<D>, public source: ElementStream<A, B, C>) {}

  run(sink: Sink<DomNode<A, B, C & D>>, scheduler: Scheduler): Disposable {

    return map(ns => {
      const style = map(style => ({...style, ...this.style}), ns.style)
      return {...ns, style}
    }, this.source).run(sink, scheduler)

  }

}




