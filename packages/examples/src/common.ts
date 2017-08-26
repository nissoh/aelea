
import { startWith, never, tap, map, chain, constant, take, until, filter, merge, delay, switchLatest, scan } from '@most/core'
import { Stream } from '@most/types'
import { compose } from '@most/prelude'
import { style, node, domEvent, element, branch } from '../core'
import { inputStyleBehaviour } from './stylesheet'



type IPredicate<T> = (x: T) => boolean

const parentNode = (node: Element) => node.parentNode as Element
const matches = (node: Element, query: string) => node instanceof Element && node.matches(query)

export const traverseParents = (f: IPredicate<Element>, node: Element): Element | null =>
  node ? f(node) ? node : traverseParents(f, parentNode(node)) : null

export const parentSelector = (query: string, node: Element) => traverseParents((node) => matches(node, query), node)

const validInputCharacter = (char: string) => /\d|\w/.test(char)
const keyCode = (x: KeyboardEvent) => x.keyCode


// export const inputEl = hoverBehavior(element('input'))






