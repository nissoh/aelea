import { $text, Behavior, component, eventElementTarget, style } from '@aelea/core'
import * as router from '@aelea/router'
import { $Anchor } from '@aelea/router'
import { map, mergeArray, multicast, now } from '@most/core'
import { $column, $main, $row } from '../common/common'
import { flex, spacing, spacingBig, spacingSmall } from '../common/stylesheet'
import { $Link } from '../components/$Link'
import { $aeleaLogo, $icon } from '../components/form/$icon'
import { fadeIn } from '../components/transitions/enter'
import $Examples from './examples/$Examples'
import $Guide from './guide/$Guide'


export { $main }


const initialPath = map(location => location.pathname, now(document.location))
const popStateEvent = eventElementTarget('popstate', window)
const locationChange = map(() => document.location.pathname, popStateEvent)


interface Website {
  baseRoute: string
}

export default ({ baseRoute }: Website) => component((
  [sampleLinkClick, routeChanges]: Behavior<string, string>
) => {

  const pathChange = mergeArray([
    initialPath,
    locationChange,
    multicast(routeChanges)
  ])

  const rootRoute = router.create({ fragment: baseRoute, title: 'aelea', pathChange })
  const guideRoute = rootRoute.create({ fragment: 'guide', title: 'Guide' })
  const examplesRoute = rootRoute.create({ fragment: 'examples', title: 'Examples' })

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

                $Link({ $content: $text('Why?!'), href: '/drag-and-sort', route: guideRoute })({
                  click: sampleLinkClick()
                }),
                $Link({ $content: $text('Developer\'s Guide'), href: '/guide', route: guideRoute })({
                  click: sampleLinkClick()
                }),
                $Link({ $content: $text('Examples'), href: '/examples/drag-and-sort', route: examplesRoute })({
                  click: sampleLinkClick()
                }),

              ),
            )
          )
        )

      ),


      $row(style({ maxWidth: '1200px', margin: '0 auto' }))(
        router.contains(guideRoute)(
          $Guide({ router: rootRoute })({})
        ),
        router.contains(examplesRoute)(
          $Examples({ router: examplesRoute })({
            routeChanges: sampleLinkClick()
          })
        )
      ),

    ])

  ]
})


