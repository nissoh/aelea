import { Stream, Sink, Scheduler, Disposable } from '@most/types'
import { ElementStream, ElementType, DomNode, StyleCSS } from '../types'

import * as CSS from 'csstype'
import { map, merge } from '@most/core'
import { curry2 } from '@most/prelude'



export const applyStyle = (styleProps: Partial<CSS.Properties<any>>, el: HTMLElement) => {
  const elementStyle = el.style as any
  for (const prop in styleProps) {
    if (styleProps.hasOwnProperty(prop)) {
      elementStyle[prop] = styleProps[prop as keyof typeof styleProps]
    }
  }
  return el
}


interface Style {
  <A, B, C extends ElementType, D>(styleInput: Stream<StyleCSS<A>> | StyleCSS<A>): (node: ElementStream<C, D, B>) => ElementStream<C, D, A & B>
  <A, B, C extends ElementType, D>(styleInput: Stream<StyleCSS<A>> | StyleCSS<A>, node: ElementStream<C, D, B>): ElementStream<C, D, A & B>
}


export const style: Style = curry2((styleInput, source) => {

  // pretty hacky.. kinda
  if ((<any>styleInput).run) {
    return map(dn => {
      const styleStream = map(styleObj => styleObj, styleInput as Stream<StyleCSS<unknown>>)
      return {
        ...dn,
        style: merge(dn.style, styleStream
        )
      }
    }, source)
  }

  if (source instanceof StyleSource) {
    return new StyleSource({ ...source.styleProps, ...styleInput }, source.source)
  }

  return new StyleSource(styleInput as StyleCSS<unknown>, source)
})

class StyleSource<A, B, C extends ElementType, D> implements ElementStream<C, A & B, D> {

  constructor(public styleProps: StyleCSS<D>, public source: ElementStream<C, A & B, D>) { }

  run(sink: Sink<DomNode<C, A, B & D>>, scheduler: Scheduler): Disposable {

    return map(ns => {
      return {
        ...ns,
        style: map(newStyle => ({ ...newStyle, ...this.styleProps }), ns.style)
      }
    }, this.source).run(sink, scheduler)
  }

}




