import { constant, map, merge, o, op, startWith } from '../../stream/index.js'
import type { IOps } from '../../stream/types.js'
import type { IBehavior } from '../../stream-extended/index.js'
import { attr, component, nodeEvent, style } from '../../ui/index.js'
import type { I$Node, INode } from '../../ui/types.js'
import type { Route } from '../types.js'

export interface IAnchor {
  url: string
  route: Route
  $anchor: I$Node
  anchorOp?: IOps<INode<HTMLAnchorElement>, INode<HTMLAnchorElement>>
}

export const $RouterAnchor = ({ url, route, $anchor, anchorOp = o() }: IAnchor) =>
  component(([click, clickTether]: IBehavior<INode, string>, [focus, focusTether]: IBehavior<INode, boolean>) => {
    const trailingSlash = /\/$/
    const href = url.replace(trailingSlash, '')

    const contains = merge(constant(true, route.contains), constant(false, route.miss))

    return [
      op(
        $anchor,
        attr({ href }),
        style({ textDecoration: 'none' }),
        clickTether(
          nodeEvent('click'),
          map((clickEv): string => {
            clickEv.preventDefault()

            const pathName = clickEv.currentTarget instanceof HTMLAnchorElement ? clickEv.currentTarget.pathname : null

            if (pathName) {
              // avoid repeated adjacent states
              if (location.pathname !== pathName) {
                history.pushState(null, '', pathName)
              }

              return pathName
            }
            throw new Error('target anchor contains no href')
          })
        ),
        focusTether($anchor => {
          const focus = constant(true, merge(nodeEvent('focus', $anchor), nodeEvent('pointerenter', $anchor)))
          const blur = constant(false, merge(nodeEvent('blur', $anchor), nodeEvent('pointerleave', $anchor)))

          return startWith(false, merge(focus, blur))
        }),
        anchorOp
      ),

      { click, match: route.match, contains, focus }
    ]
  })
