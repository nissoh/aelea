import { constant, map, merge, op, start } from '../stream/index.js'
import type { IBehavior } from '../stream-extended/index.js'
import { pallete } from '../ui-components-theme/index.js'
import type { I$Node, INode } from '../ui-renderer-dom/index.js'
import { $element, attr, component, nodeEvent, style, stylePseudo } from '../ui-renderer-dom/index.js'
import { pushUrl } from './location.js'
import { href, type RouteNode, type RouteSpec } from './manifest.js'
import type { Route } from './types.js'

export interface IAnchor {
  route: Route
  params?: Record<string, string>
  $anchor?: I$Node
}

export const $defaultAnchor: I$Node = $element('a')(
  style({
    color: pallete.message,
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'color 120ms ease-out'
  }),
  stylePseudo(':hover', { color: pallete.primary }),
  stylePseudo(':focus-visible', {
    outline: `2px solid ${pallete.primary}`,
    outlineOffset: '2px',
    borderRadius: '2px'
  })
)()

export const $Link = ({ route, params, $anchor = $defaultAnchor }: IAnchor) => {
  const url = href(route as RouteNode<RouteSpec>, params as never)

  return component(
    (
      [focus, focusTether]: IBehavior<INode<HTMLAnchorElement>, boolean>,
      [click, clickTether]: IBehavior<INode<HTMLAnchorElement>, string>
    ) => [
      op(
        $anchor,
        attr({ href: url }),
        focusTether($node => {
          const focusOn = constant(true, merge(nodeEvent('focus', $node), nodeEvent('pointerenter', $node)))
          const focusOff = constant(false, merge(nodeEvent('blur', $node), nodeEvent('pointerleave', $node)))
          return start(false, merge(focusOn, focusOff))
        }),
        clickTether(
          nodeEvent('click'),
          map((ev): string => {
            ev.preventDefault()
            pushUrl(url)
            return url
          })
        )
      ),
      { focus, click }
    ]
  )
}
