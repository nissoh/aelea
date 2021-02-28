import { component, Behavior, IBranch, attr, $Node, event, style, $element } from "@aelea/core"
import { constant, map, merge, startWith } from "@most/core"
import { Route } from "../types"


export interface IAnchor {
  href: string,
  $content: $Node,
  route: Route
}

const $anchor = $element('a')(
  style({ textDecoration: 'none', })
)

export const $Anchor = ({ href, route, $content }: IAnchor) => component((
  [sampleClick, click]: Behavior<IBranch, string>,
  [sampleFocus, focus]: Behavior<IBranch, boolean>,
) => {

  // the main entry to a page this http://example.com/app "app" should be considired as the root fragment
  const rootFragment = route.fragments[0]

  return [
    $anchor(
      attr({ href: rootFragment + href }),
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

    { click, active: route.match, focus }
  ]
})