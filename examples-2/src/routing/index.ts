import { map, mergeArray, multicast, now } from '@most/core'
import { newDefaultScheduler } from '@most/scheduler'
import { $element, $text, attr, Behavior, component, event, eventElementTarget, $ChildNode, Op, runAt, style, NodeContainer } from '@aelea/core'
import { path, router } from '@aelea/router'
import { $bodyRoot, $column, $mainCard, $row } from '../common/common'
import * as designSheet from '../common/stylesheet'


const initialPath = map(location => location.pathname, now(document.location))
const popStateEvent = eventElementTarget('popstate', window)
const locationChange = map(() => document.location.pathname, popStateEvent)


const $anchor = $element('a')(
  designSheet.btn
)

interface Link {
  href: string,
  $content: $ChildNode
}

const $Link = (config: Link) => component((
  [sampleClick, click]
) => {

  const changeLocationBehavior: Op<NodeContainer, NodeContainer> = sampleClick(
    event('click'),
    map((clickEv): string => {
      clickEv.preventDefault()

      const pathName = clickEv.currentTarget instanceof HTMLAnchorElement ? clickEv.currentTarget.pathname : null

      if (pathName) {
        history.pushState(null, '', config.href)
        return pathName
      }

      throw new Error('target anchor contains no href')
    })
  )

  return [
    $anchor(
      attr({ href: config.href }),
      changeLocationBehavior
    )(config.$content),

    { click }
  ]
})


const $Main = component((
  [sampleLinkClick, routeChanges]: Behavior<NodeContainer, string>
) => {

  const routeChange = mergeArray([
    initialPath,
    locationChange,
    multicast(routeChanges)
  ])
  const rootRoute = router(routeChange)

  const p1 = rootRoute.create(/p1/)
  const p2 = rootRoute.create('p2')

  const p1Inner = p1.create('inner')

  return [

    path(rootRoute)(
      $column(

        $row(designSheet.spacingSmall)(
          $Link({ $content: $text('Home'), href: '/' })({
            click: sampleLinkClick()
          }),
          $Link({ $content: $text('p1'), href: '/p1' })({
            click: sampleLinkClick()
          }),
          $Link({ $content: $text('p2'), href: '/p2' })({
            click: sampleLinkClick()
          }),
          $Link({ $content: $text('inside p1'), href: '/p1/inner' })({
            click: sampleLinkClick()
          }),
        ),


        $row(style({ alignSelf: 'stretch' }))(
          $element('hr')(designSheet.flex)()
        ),

        path(p1)(
          $column(
            $text('p1'),
            $Link({ $content: $text('Back Home'), href: '/' })({
              click: sampleLinkClick()
            }),
          )
        ),
        path(p2)(
          $row(
            $text('p2')
          )
        ),
        path(p1Inner)(
          $column(
            $text('p1nner'),
          )
        )


      )
    )

  ]
})


runAt(
  $bodyRoot(
    $mainCard(
      $Main({})
    )
  ),
  newDefaultScheduler()
)




