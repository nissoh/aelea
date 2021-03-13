import { $node, $text, Behavior, component, eventElementTarget, style } from '@aelea/core'
import * as router from '@aelea/router'
import { $Anchor } from '@aelea/router'
import { $column, $row, layoutSheet } from '@aelea/ui-components'
import { map, merge, multicast, now } from '@most/core'
import { $aeleaLogo, $icon } from '../common/$icons'
import { fadeIn } from '../components/transitions/enter'
import $Examples from './examples/$Examples'
import $Guide from './guide/$Guide'
import { designSheet } from '@aelea/ui-components'
import $MainMenu from './$MainMenu'




const popStateEvent = eventElementTarget('popstate', window)
const initialLocation = now(document.location)
const requestRouteChange = merge(initialLocation, popStateEvent)
const locationChange = map((location) => {
  return location
}, requestRouteChange)


interface Website {
  baseRoute: string
}

export default ({ baseRoute }: Website) => component((
  [sampleLinkClick, routeChanges]: Behavior<string, string>
) => {

  const changes = merge(locationChange, multicast(routeChanges))
  const fragmentsChange = map(() => {
    const trailingSlash = /\/$/
    const relativeUrl = location.href.replace(trailingSlash, '').split(document.baseURI.replace(trailingSlash, ''))[1]
    const frags = relativeUrl.split('/')
    frags.splice(0, 1, baseRoute)
    return frags
  }, changes)

  const rootRoute = router.create({ fragment: baseRoute, title: 'aelea', fragmentsChange })
  const pagesRoute = rootRoute.create({ fragment: 'p', title: 'aelea' })
  const guideRoute = pagesRoute.create({ fragment: 'guide', title: 'Guide' })
  const examplesRoute = pagesRoute.create({ fragment: 'examples', title: 'Examples' })

  return [
    $node(designSheet.main)(
      router.match(rootRoute)(
        $row(layoutSheet.flex, layoutSheet.spacingBig, style({ alignContent: 'center', alignItems: 'center', placeContent: 'center', textAlign: 'center', padding: '0 30px', }))(
          fadeIn(
            $column(style({ alignItems: 'center', maxWidth: '550px' }), layoutSheet.spacing)(
              $Anchor({ $content: $icon({ $content: $aeleaLogo, width: 237, height: 115, viewBox: `0 0 147 90` }), url: '/', route: rootRoute })({
                click: sampleLinkClick()
              }),
              $text(`"aelea", is a UI Framework for reactive event programming`),
              $text(`It helps you write composable and performant building blocks by composing functional event streams`),

              $MainMenu({ parentRoute: pagesRoute })({
                routeChange: sampleLinkClick()
              })
            )
          )
        )
      ),

      router.contains(pagesRoute)(
        $column(layoutSheet.spacingBig, style({ maxWidth: '870px', width: '100%', margin: '0 auto', paddingBottom: '45px' }))(
          $row(style({ placeContent: 'space-between', padding: '0 15px' }))(
            $Anchor({ $content: $icon({ $content: $aeleaLogo, width: 137, height: 115, viewBox: `0 0 147 90` }), url: '/', route: rootRoute })({
              click: sampleLinkClick()
            }),
            $MainMenu({ parentRoute: pagesRoute })({
              routeChange: sampleLinkClick()
            })
          ),
          router.contains(guideRoute)(
            $Guide({ parentRoute: rootRoute })({})
          ),
          router.contains(examplesRoute)(
            $Examples({ router: examplesRoute })({
              routeChanges: sampleLinkClick()
            })
          )
        )
      )
    )

  ]
})


