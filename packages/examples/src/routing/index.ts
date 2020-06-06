
import { map, mergeArray, tap, now, runEffects } from '@most/core'
import { component, event, style, $element, $text, ProxyStream, eventTarget, renderAt, attr, splitBehavior, O, DomNode, Behavior, Sample } from 'fufu'
import { newDefaultScheduler } from '@most/scheduler'
import { router, path } from 'match-trie'
import { $row, $column } from '../common/flex'
import * as stylesheet from '../style/stylesheet'


const initialPath = map(location => location.pathname, now(document.location))
const popStateEvent = map(() => document.location.pathname, eventTarget('popstate', window))



const $anchor = $element('a')(
  stylesheet.btn,
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


const $main = component(([linkClick, routeChanges]: Behavior<DomNode, string>) => {


  const linkChange = map((href) => href, routeChanges)

  const routeChange = mergeArray([
    initialPath,
    popStateEvent,
    linkChange
  ])

  const rootRoute = router(routeChange)

  const p1 = rootRoute.create(/p1/)
  const p2 = rootRoute.create('p2')


  const p1Inner = p1.create('inner')

  const $link = createLink(linkClick)

  return (

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
          $element('hr')(stylesheet.flex)()
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


  )
})

runEffects(
  renderAt(document.body, $main),
  newDefaultScheduler()
)



