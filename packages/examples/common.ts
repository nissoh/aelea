
import { startWith, never, tap, map, chain, constant, take, until, filter, merge, delay, switchLatest, scan } from '@most/core'
import { Stream } from '@most/types'
import { compose } from '@most/prelude'

import { node, domEvent, NodeStreamLike, element, branch, text, component, style, Style } from '../dom'

export const always = <T>(x: T): Stream<T> => startWith(x, never())

export const centerStyle = { alignItems: 'center', justifyContent: 'center' }
export const flexStyle = { flex: 1 }
export const displayFlex = { display: 'flex' }
const columnStyle = { flexDirection: 'column' }
export const mainStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol"'
}

export const inputStyle = {
  ...displayFlex,
  minWidth: '100px',
  backgroundColor: 'transparent',
  border: 'none',
  borderBottom: '1px dotted #ccc',
  fontWeight: '100',
  padding: '15px',
  margin: '0 10px',
  outline: 0,
  fontSize: '18px',
  cursor: 'text'
}

export const flex =   style(constant(flexStyle), node)
export const row =    style(constant({...displayFlex, ...flexStyle}), node)
export const column = style(constant({...columnStyle, ...displayFlex, ...flexStyle}), node)

export const mainCentered = style(constant(mainStyle), row)

type IPredicate<T> = (x: T) => boolean

const parentNode = (node: Element) => node.parentNode as Element
const matches = (node: Element, query: string) => node instanceof Element && node.matches(query)

export const traverseParents = (f: IPredicate<Element>, node: Element): Element | null =>
  node ? f(node) ? node : traverseParents(f, parentNode(node)) : null
export const parentSelector = (query: string, node: Element) => traverseParents((node) => matches(node, query), node)

const validInputCharacter = (char: string) => /\d|\w/.test(char)
const keyCode = (x: KeyboardEvent) => x.keyCode

export const pipe = <A, B, C>(a: (a: A) => B, b: (b: B) => C) => (x: A) => b(a(x))

const bg = (backgroundColor: string) => constant({ backgroundColor })

const inputStyle$ = style(constant({ ...displayFlex, ...flexStyle, ...inputStyle }))
const hoverStyle = pipe(chain(domEvent('focus')), bg('#cccccc'))
const blurStyle = pipe(chain(domEvent('blur')), bg(''))
const hoverBehaviour = pipe(inputStyle$, pipe(style(hoverStyle), style(blurStyle)))

export const inputEl = hoverBehaviour(element('input'))
