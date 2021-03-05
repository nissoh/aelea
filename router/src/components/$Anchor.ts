import { component, Behavior, IBranch, attr, $Node, event, style, $element } from "@aelea/core"
import { constant, map, merge, startWith } from "@most/core"
import { Route } from "../types"
import * as router from '@aelea/router'


export interface IAnchor {
  url: string,
  $content: $Node,
  route: Route
}

const $anchor = $element('a')(
  style({ textDecoration: 'none', })
)

export const $Anchor = ({ url, route, $content }: IAnchor) => component((
  [sampleClick, click]: Behavior<IBranch, string>,
  [sampleFocus, focus]: Behavior<IBranch, boolean>,
) => {

  const trailingSlash = /\/$/
  const href = url.replace(trailingSlash, '')

  const contains = merge(
    constant(true, route.contains),
    constant(false, route.miss)
  )

  return [
    $anchor(
      attr({ href }),
      sampleClick(
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
      sampleFocus(
        $anchor => {
          const focus = constant(true, merge(event('focus', $anchor), event('pointerenter', $anchor)))
          const blur = constant(false, merge(event('blur', $anchor), event('pointerleave', $anchor)))

          return startWith(false, merge(focus, blur))
        },
      ),
    )($content),

    { click, match: route.match, contains, focus }
  ]
})