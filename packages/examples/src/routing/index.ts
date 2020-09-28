
import { map, mergeArray, now } from '@most/core'
import { newDefaultScheduler } from '@most/scheduler'
import { $element, $text, attr, Behavior, component, DomNode, event, eventTarget, runAt, Sample, style } from 'fufu'
import { path, router } from 'match-trie'
import { $column, $examplesRoot, $row } from '../common/common'
import * as designSheet from '../common/style/stylesheet'


const initialPath = map(location => location.pathname, now(document.location))
const popStateEvent = eventTarget('popstate', window)
const locationChange = map(() => document.location.pathname, popStateEvent)


const $anchor = $element('a')(
  designSheet.btn,
  style({ margin: '6px' }),
)

const createLink = (linkB: Sample<DomNode, string>) => (href: string) =>
  $anchor(
    attr({ href }),
    linkB(
      event('click'),
      map(clickEv => {
        clickEv.preventDefault()

        const pathName = clickEv.currentTarget instanceof HTMLAnchorElement ? clickEv.currentTarget.pathname : null

        if (pathName) {
          history.pushState(null, '', href)
        }
        return pathName
      })
    )
  )


const $Main = component((
  [sampleLinkClick, routeChanges]: Behavior<DomNode, string>
) => {

  const linkChange = map((href) => href, routeChanges)

  const routeChange = mergeArray([
    initialPath,
    locationChange,
    linkChange
  ])

  const rootRoute = router(routeChange)

  const p1 = rootRoute.create(/p1/)
  const p2 = rootRoute.create('p2')


  const p1Inner = p1.create('inner')

  const $link = createLink(sampleLinkClick)

  return [

    path(rootRoute)(
      $column(

        $row(
          $link('/')(
            $text('Home')
          ),
          $link('/p1')(
            $text('p1')
          ),
          $link('/p2')(
            $text('p2')
          ),
          $link('/p1/inner')(
            $text('inside p1')
          )
        ),


        $row(style({ alignSelf: 'stretch' }))(
          $element('hr')(designSheet.flex)()
        ),

        path(p1)(
          $column(
            $text('p1'),
            $link('/')(
              $text('Back Home')
            ),
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
  $examplesRoot(
    $Main()
  ),
  newDefaultScheduler()
)




