import { $element, $text, $wrapNativeElement, component, eventElementTarget, style } from 'aelea/core'
import * as router from 'aelea/router'
import { $RouterAnchor } from 'aelea/router'
import { type IBehavior, map, merge, multicast, now } from 'aelea/stream'
import { $column, $icon, $row, designSheet, spacing } from 'aelea/ui-components'
import { pallete, themeList } from 'aelea/ui-components-theme'
import { $Picker } from '../components/$ThemePicker'
import { fadeIn } from '../components/transitions/enter'
import { $aeleaLogo } from '../elements/$icons'
import $MainMenu from './$MainMenu'
import $Examples from './examples/$Examples'
import $Guide from './guide/$Guide'

const popStateEvent = eventElementTarget('popstate', window)
const initialLocation = now(document.location)
const requestRouteChange = merge(initialLocation, popStateEvent)
const locationChange = map(location => {
  return location
}, requestRouteChange)

interface Website {
  baseRoute: string
}

export default ({ baseRoute }: Website) =>
  component(([routeChanges, linkClickTether]: IBehavior<string, string>) => {
    const changes = merge(locationChange, multicast(routeChanges))
    const fragmentsChange = map(() => {
      const trailingSlash = /\/$/
      const relativeUrl = location.href.replace(trailingSlash, '').split(document.baseURI.replace(trailingSlash, ''))[1]
      const frags = relativeUrl.split('/')
      frags.splice(0, 1, baseRoute)
      return frags
    }, changes)

    const rootRoute = router.create({
      fragment: baseRoute,
      title: 'aelea',
      fragmentsChange
    })
    const pagesRoute = rootRoute.create({ fragment: 'p', title: 'aelea' })
    const guideRoute = pagesRoute.create({ fragment: 'guide', title: 'Guide' })
    const examplesRoute = pagesRoute.create({
      fragment: 'examples',
      title: 'Examples'
    })

    return [
      $wrapNativeElement(document.body)(
        designSheet.main,
        designSheet.customScroll,
        style({
          backgroundColor: pallete.background,
          fontFamily: `'Nunito', Fira Code`,
          backgroundImage: `radial-gradient(at center center, ${pallete.horizon} 50vh, ${pallete.background})`
        })
      )(
        router.match(rootRoute)(
          $row(
            style({
              flex: 1,
              minHeight: '100%',
              alignContent: 'center',
              alignItems: 'center',
              placeContent: 'center',
              textAlign: 'center',
              padding: '0 30px'
            })
          )(
            fadeIn(
              $column(style({ alignItems: 'center', maxWidth: '550px' }), spacing.big)(
                $RouterAnchor({
                  url: '/',
                  route: rootRoute,
                  $anchor: $element('a')(
                    $icon({
                      $content: style({ fill: pallete.message }, $aeleaLogo),
                      width: '237px',
                      height: '115px',
                      viewBox: '0 0 147 90'
                    })
                  )
                })({
                  click: linkClickTether()
                }),
                $column(spacing.small)(
                  $text(`"aelea", is a UI Framework for reactive event programming`),
                  $text(
                    'It helps you write composable and performant building blocks by composing functional event streams'
                  )
                ),

                $MainMenu({ parentRoute: pagesRoute })({
                  routeChange: linkClickTether()
                })
              )
            )
          )
        ),

        router.contains(pagesRoute)(
          $column(
            spacing.big,
            style({
              maxWidth: '870px',
              width: '100%',
              margin: '0 auto',
              paddingBottom: '45px'
            })
          )(
            $row(style({ placeContent: 'space-between', padding: '0 15px' }))(
              $RouterAnchor({
                $anchor: $element('a')(
                  $icon({
                    $content: $aeleaLogo,
                    fill: pallete.message,
                    width: '137px',
                    height: '115px',
                    viewBox: '0 0 147 90'
                  })
                ),
                url: '/',
                route: rootRoute
              })({
                click: linkClickTether()
              }),
              $MainMenu({ parentRoute: pagesRoute })({
                routeChange: linkClickTether()
              })
            ),
            router.match(guideRoute)($Guide()({})),
            router.contains(examplesRoute)(
              $Examples({ router: examplesRoute })({
                routeChanges: linkClickTether()
              })
            )
          )
        ),

        $Picker(themeList)({})
      )
    ]
  })
