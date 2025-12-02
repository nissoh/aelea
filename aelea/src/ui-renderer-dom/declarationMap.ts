import type { DeclarationMap } from '@/ui'
import type { INodeElement } from './types.js'

export const DECLARATION_MAP: DeclarationMap<Node> = {
  element: (tag: string) => document.createElement(tag),
  custom: (tag: string) => document.createElement(tag),
  node: () => document.createElement('div'),
  svg: (tag: string) => document.createElementNS('http://www.w3.org/2000/svg', tag),
  wrap: <A extends INodeElement>(rootNode: A) => rootNode,
  text: (value: string) => document.createTextNode(value),
  setText: (el: Node, value: string) => {
    if ('nodeValue' in el) {
      ;(el as Node).nodeValue = value
      return
    }
    ;(el as any).textContent = value
  }
} as const
