import { constant, map, merge, nowWith, start } from '../stream/index.js'
import type { IBehavior } from '../stream-extended/index.js'
import { palette } from '../ui-components-theme/index.js'
import type { I$Slottable, INode, INodeCompose, IStyleCSS } from '../ui-renderer-dom/index.js'
import {
  $element,
  attr,
  component,
  effectProp,
  nodeEvent,
  style,
  styleBehavior,
  stylePseudo
} from '../ui-renderer-dom/index.js'
import { pushUrl } from './location.js'
import { href, type RouteNode, type RouteSpec } from './manifest.js'
import { isContaining } from './resolveUrl.js'
import type { Route } from './types.js'

export interface IAnchor {
  route: Route
  $content: I$Slottable
  params?: Record<string, string>
  $anchor?: INodeCompose<HTMLAnchorElement>
}

export const $defaultAnchor = $element('a')(
  style({
    color: palette.message,
    cursor: 'pointer',
    transition: 'color 120ms ease-out'
  }),
  stylePseudo(':hover', { color: palette.primary }),
  stylePseudo(':focus-visible', {
    outline: `2px solid ${palette.primary}`,
    outlineOffset: '2px',
    borderRadius: '2px'
  })
)

export const $Link = ({ route, $content, params, $anchor = $defaultAnchor }: IAnchor) => {
  const url = href(route as RouteNode<RouteSpec>, params as never)
  const active = isContaining(route)

  const onclick = (ev: MouseEvent) => {
    if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button !== 0) return
    ev.preventDefault()
    pushUrl(url)
  }

  return component(
    (
      [focus, focusTether]: IBehavior<INode<HTMLAnchorElement>, boolean>,
      [click, clickTether]: IBehavior<INode<HTMLAnchorElement>, MouseEvent>
    ) => [
      $anchor(
        attr({ href: url }),
        effectProp(
          'onclick',
          nowWith(() => onclick)
        ),
        styleBehavior(
          map((isActive): IStyleCSS | null => (isActive ? { color: palette.primary, cursor: 'default' } : null), active)
        ),
        focusTether($node => {
          const focusOn = constant(true, merge(nodeEvent('focus', $node), nodeEvent('pointerenter', $node)))
          const focusOff = constant(false, merge(nodeEvent('blur', $node), nodeEvent('pointerleave', $node)))
          return start(false, merge(focusOn, focusOff))
        }),
        clickTether(nodeEvent('click'))
      )($content),
      { focus, click, active }
    ]
  )
}
