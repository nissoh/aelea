import { $element, $node, $text, Behavior, component, eventElementTarget, style } from '@aelea/core'
import * as router from '@aelea/router'
import { $RouterAnchor } from '@aelea/router'
import { $column, $icon, $row, layoutSheet } from '@aelea/ui-components'
import { map, merge, multicast, now } from '@most/core'
import { $aeleaLogo } from '../elements/$icons'
import { fadeIn } from '../components/transitions/enter'
import $Examples from './examples/$Examples'
import $Guide from './guide/$Guide'
import { designSheet } from '@aelea/ui-components'
import $MainMenu from './$MainMenu'
import { $Picker } from '../components/$ThemePicker'
import { dark, light } from '../common/theme'
import { pallete } from '@aelea/ui-components-theme'




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
  [routeChanges, linkClickTether]: Behavior<string, string>
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
    $node(designSheet.main, style({ backgroundImage: `radial-gradient(at center center, ${pallete.horizon} 50vh, ${pallete.background})`, }))(
      router.match(rootRoute)(
        $row(layoutSheet.flex, style({ minHeight: '100%', alignContent: 'center', alignItems: 'center', placeContent: 'center', textAlign: 'center', padding: '0 30px', }))(
          fadeIn(
            $column(style({ alignItems: 'center', maxWidth: '550px' }), layoutSheet.spacingBig)(
              $RouterAnchor({ url: '/', route: rootRoute, $anchor: $element('a')($icon({ $content: style({ fill: pallete.message }, $aeleaLogo), width: '237px', height: '115px', viewBox: `0 0 147 90` })) })({
                click: linkClickTether()
              }),
              $column(layoutSheet.spacingSmall)(
                $text(`"aelea", is a UI Framework for reactive event programming`),
                $text(`It helps you write composable and performant building blocks by composing functional event streams`),
              ),

              $MainMenu({ parentRoute: pagesRoute })({
                routeChange: linkClickTether()
              })
            )
          )
        )
      ),

      router.contains(pagesRoute)(
        $column(layoutSheet.spacingBig, style({ maxWidth: '870px', width: '100%', margin: '0 auto', paddingBottom: '45px' }))(
          $row(style({ placeContent: 'space-between', padding: '0 15px' }))(
            $RouterAnchor({ $anchor: $element('a')($icon({ $content: $aeleaLogo, fill: pallete.message, width: '137px', height: '115px', viewBox: `0 0 147 90` })), url: '/', route: rootRoute })({
              click: linkClickTether()
            }),
            $MainMenu({ parentRoute: pagesRoute })({
              routeChange: linkClickTether()
            })
          ),
          router.match(guideRoute)(
            $Guide({ parentRoute: rootRoute })({})
          ),
          router.contains(examplesRoute)(
            $Examples({ router: examplesRoute })({
              routeChanges: linkClickTether()
            })
          )
        )
      ),


      $Picker([light, dark])({})
    )

  ]
})


