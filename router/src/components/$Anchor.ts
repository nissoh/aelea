import { component, Behavior, IBranch, attr, event, style, $Branch } from "@aelea/core"
import { O, Op } from "@aelea/utils"
import { constant, map, merge, startWith } from "@most/core"
import { Route } from "../types"

export interface IAnchor {
  url: string,
  route: Route
  $anchor: $Branch
  anchorOp?: Op<IBranch<HTMLAnchorElement>, IBranch<HTMLAnchorElement>>
}



export const $RouterAnchor = ({ url, route, $anchor, anchorOp = O() }: IAnchor) => component((
  [click, clickTether]: Behavior<IBranch, string>,
  [focus, focusTether]: Behavior<IBranch, boolean>,
) => {

  const trailingSlash = /\/$/
  const href = url.replace(trailingSlash, '')

  const contains = merge(
    constant(true, route.contains),
    constant(false, route.miss)
  )

  const anchorOps = O(
    attr({ href }),
    style({ textDecoration: 'none', padding: '1px 5px' }),
    clickTether(
      event('click'),
      map((clickEv): string => {
        clickEv.preventDefault()

        const pathName = clickEv.currentTarget instanceof HTMLAnchorElement ? clickEv.currentTarget.pathname : null

        if (pathName) {

          // avoid repeated adjacent states
          if (location.pathname !== pathName) {
            history.pushState(null, '', pathName)
          }

          return pathName
        } else {
          throw new Error('target anchor contains no href')
        }
      })
    ),
    focusTether(
      $anchor => {
        const focus = constant(true, merge(event('focus', $anchor), event('pointerenter', $anchor)))
        const blur = constant(false, merge(event('blur', $anchor), event('pointerleave', $anchor)))

        return startWith(false, merge(focus, blur))
      },
    ),
    anchorOp
  )

  return [
    anchorOps(
      $anchor
    ),

    { click, match: route.match, contains, focus }
  ]
})