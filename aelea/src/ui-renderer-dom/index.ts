import type { INodeCompose } from '@/ui'
import { $custom, $element, $svg, $wrapNativeElement } from '@/ui'
export { createStylePseudoRule, createStyleRule, render } from './dom.js'
export { fromEventTarget, nodeEvent } from './event.js'

// Typed DOM-facing helpers (keep core factories agnostic)
export const $elementDom = <K extends keyof HTMLElementTagNameMap>(tag: K): INodeCompose<HTMLElementTagNameMap[K]> =>
  ($element(tag) as unknown) as INodeCompose<HTMLElementTagNameMap[K]>
export const $svgDom = <K extends keyof SVGElementTagNameMap>(tag: K): INodeCompose<SVGElementTagNameMap[K]> =>
  ($svg(tag) as unknown) as INodeCompose<SVGElementTagNameMap[K]>
export const $customDom = <T extends Element = Element>(tag: string): INodeCompose<T> =>
  ($custom(tag) as unknown) as INodeCompose<T>
export const $wrapDomElement = <T extends Element>(el: T): INodeCompose<T> =>
  ($wrapNativeElement(el) as unknown) as INodeCompose<T>
