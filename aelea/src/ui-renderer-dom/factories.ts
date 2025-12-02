import { createNode, type INodeCompose } from '@/ui'
import type { INodeComposeDom } from './types.js'

export function $element<K extends keyof HTMLElementTagNameMap>(tag: K): INodeCompose<HTMLElementTagNameMap[K]>
export function $element(tag?: string): INodeCompose<HTMLElement>
export function $element(tag = 'div') {
  return createNode(() => document.createElement(tag))
}

export function $svg<K extends keyof SVGElementTagNameMap>(tag: K): INodeCompose<SVGElementTagNameMap[K]>
export function $svg(tag: string): INodeCompose<SVGElement>
export function $svg(tag: string) {
  return createNode(() => document.createElementNS('http://www.w3.org/2000/svg', tag))
}

export function $custom(tag: string): INodeCompose<HTMLElement> {
  return createNode(() => document.createElement(tag))
}

export const $node: INodeComposeDom = createNode(() => document.createElement('div'))

export function $wrapNativeElement<T extends Element>(element: T): INodeCompose<T> {
  return createNode<T>(() => element)
}
