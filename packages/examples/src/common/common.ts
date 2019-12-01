

type IPredicate<T> = (x: T) => boolean

const parentNode = (node: Element) => node.parentNode as Element
const matches = (node: Element, query: string) => node instanceof Element && node.matches(query)

export const traverseParents = (f: IPredicate<Element>, node: Element): Element | null =>
  node ? f(node) ? node : traverseParents(f, parentNode(node)) : null

export const parentSelector = (query: string, node: Element) => traverseParents((node) => matches(node, query), node)

export const validInputCharacter = (char: string) => /\d|\w/.test(char)
export const keyCode = (x: KeyboardEvent) => x.keyCode


// export const inputEl = hoverBehavior(element('input'))






