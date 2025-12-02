import type { INode } from '../ui/types.js'

export type ReactElementLike = {
  $$typeof: symbol
  type: string | symbol
  key: null
  ref: null
  props: Record<string, any>
  _owner: null
}

type ReactNodeLike = ReactElementLike | string | number | null

const REACT_ELEMENT_TYPE = Symbol.for('react.element')

function createReactElement(
  tag: string,
  props: Record<string, any>,
  style: Record<string, any>,
  children: ReactNodeLike[],
  className?: string | string[]
): ReactElementLike {
  const hasChildren = children.length > 0
  const childrenProp = children.length === 1 ? children[0] : hasChildren ? children : undefined

  const mergedProps: Record<string, any> = { ...props }
  if (className && (Array.isArray(className) ? className.length : (className as string).length)) {
    mergedProps.className = Array.isArray(className) ? className.filter(Boolean).join(' ').trim() : className
  }
  if (style && Object.keys(style).length) mergedProps.style = style
  if (hasChildren) mergedProps.children = childrenProp

  return {
    $$typeof: REACT_ELEMENT_TYPE,
    type: tag,
    key: null,
    ref: null,
    props: mergedProps,
    _owner: null
  }
}

export function manifestToReact(node: INode): ReactElementLike {
  const children = (node.$segments ?? []).map(child => {
    if ('$segments' in (child as any)) return manifestToReact(child as any)
    const el = (child as any).element
    if (el && typeof el.nodeValue === 'string') return el.nodeValue
    return el ?? ''
  })

  const style = (node as any).style ?? {}
  const attrs = (node as any).attributes ?? {}
  const className = (node as any).element?.className ?? ''
  const tag = (node as any).element?.tagName?.toLowerCase?.() ?? 'div'

  return createReactElement(tag, attrs, style, children as ReactNodeLike[], className)
}
