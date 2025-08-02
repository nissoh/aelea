import { attr } from '../../core/combinator/attribute.js'
import { component } from '../../core/combinator/component.js'
import { nodeEvent } from '../../core/combinator/event.js'
import { style } from '../../core/combinator/style.js'
import type { I$Node, INode } from '../../core/types.js'
import { type IBehavior, type IOps, map, merge, op, startWith } from '../../stream/index.js'
import type { PathEvent, Route } from '../types.js'

export interface IAnchor {
  url: string
  route: Route
  $anchor: I$Node
  anchorOp?: IOps<INode<HTMLAnchorElement>>
}

export const $RouterAnchor = ({ url, route, $anchor, anchorOp = op }: IAnchor) =>
  component(([click, clickTether]: IBehavior<any, string>, [focus, focusTether]: IBehavior<any, boolean>) => {
    const trailingSlash = /\/$/
    const href = url.replace(trailingSlash, '')

    const contains = merge(
      map<PathEvent, boolean>(() => true, route.contains),
      map<PathEvent, boolean>(() => false, route.miss)
    )

    const anchorWithOps = op(
      $anchor,
      attr({ href }),
      style({ textDecoration: 'none' }),
      clickTether(
        nodeEvent('click'),
        map((clickEv: MouseEvent): string => {
          clickEv.preventDefault()

          const pathName = clickEv.currentTarget instanceof HTMLAnchorElement ? clickEv.currentTarget.pathname : null

          if (!pathName) {
            throw new Error('target anchor contains no href')
          }

          // avoid repeated adjacent states
          if (location.pathname !== pathName) {
            history.pushState(null, '', pathName)
          }

          return pathName
        })
      ),
      focusTether(() => {
        const focus = op(
          merge(nodeEvent('focus')($anchor), nodeEvent('pointerenter')($anchor)),
          map(() => true)
        )
        const blur = op(
          merge(nodeEvent('blur')($anchor), nodeEvent('pointerleave')($anchor)),
          map(() => false)
        )
        return startWith(false)(merge(focus, blur))
      }),
      anchorOp
    )

    return [anchorWithOps, { click, match: route.match, contains, focus }]
  })
