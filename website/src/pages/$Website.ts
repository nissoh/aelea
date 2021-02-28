import { $text, Behavior, component, eventElementTarget, style } from '@aelea/core'
import * as router from '@aelea/router'
import { $Anchor } from '@aelea/router'
import { map, merge, mergeArray, multicast, now } from '@most/core'
import { $column, $main, $row } from '../common/common'
import { flex, spacing, spacingBig, spacingSmall } from '../common/stylesheet'
import { $Link } from '../components/$Link'
import { $aeleaLogo, $icon } from '../components/form/$icon'
import { fadeIn } from '../components/transitions/enter'
import $Examples from './examples/$Examples'
import $Guide from './guide/$Guide'


export { $main }


const popStateEvent = eventElementTarget('popstate', window)
const initialLocation = now(document.location)
const requestRouteChange = merge(initialLocation, popStateEvent)
const locationChange = map(() => location.pathname, requestRouteChange)


interface Website {
  baseRoute: string
}

export default ({ baseRoute }: Website) => component((
  [sampleLinkClick, routeChanges]: Behavior<string, string>
) => {

  const changes = merge(locationChange, multicast(routeChanges))
  const fragmentsChange = map(pathStr => pathStr.replace(/^\/|\/$/g, '').split('/'), changes)

  const rootRoute = router.create({ fragment: baseRoute, title: 'aelea', fragmentsChange })
  const pagesRoute = rootRoute.create({ fragment: 'p', title: 'aelea' })
  const guideRoute = pagesRoute.create({ fragment: 'guide', title: 'Guide' })
  const examplesRoute = pagesRoute.create({ fragment: 'examples', title: 'Examples' })

  return [
    mergeArray([
      router.match(rootRoute)(

        $row(flex, spacingBig, style({ alignContent: 'center', alignItems: 'center', placeContent: 'center', textAlign: 'center', padding: '0 30px', }))(

          fadeIn(
            $column(style({ alignItems: 'center', maxWidth: '550px' }), spacing)(
              $Anchor({ $content: $icon({ $content: $aeleaLogo, width: 237, height: 115, viewBox: `0 0 147 90` }), href: '/', route: rootRoute })({
                click: sampleLinkClick()
              }),
              $text(`"aelea", is a UI Framework for reactive event programming`),
              $text(`It helps you write composable and performant building blocks by composing functional event streams`),

              $row(spacingSmall, style({ paddingTop: '20px', alignItems: 'flex-start', placeContent: 'center' }))(

                // $Link({ $content: $text('Why?!'), href: '/drag-and-sort', route: guideRoute })({
                //   click: sampleLinkClick()
                // }),
                $Link({ $content: $text('Developer\'s Guide'), href: '/p/guide', route: guideRoute })({
                  click: sampleLinkClick()
                }),
                $Link({ $content: $text('Examples'), href: '/p/examples/drag-and-sort', route: examplesRoute })({
                  click: sampleLinkClick()
                }),
              ),
            )
          )
        )

      ),

      router.contains(pagesRoute)(
        $column(style({ maxWidth: '1200px', margin: '0 auto' }))(
          $row(
            $Anchor({ $content: $icon({ $content: $aeleaLogo, width: 137, height: 115, viewBox: `0 0 147 90` }), href: '/', route: rootRoute })({
              click: sampleLinkClick()
            }),
          ),
          router.contains(guideRoute)(
            $Guide({ router: rootRoute })({})
          ),
          router.contains(examplesRoute)(
            $Examples({ router: examplesRoute })({
              routeChanges: sampleLinkClick()
            })
          )
        )
      )
    ])

  ]
})


