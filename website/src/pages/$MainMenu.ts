import { $element, $text, attr, Behavior, component, style, stylePseudo } from '@aelea/core'
import { $row, layoutSheet } from '@aelea/ui-components'
import { $Link } from '../components/$Link'
import { $github, $icon } from '../common/$icons'
import { Route } from '@aelea/router'
import { theme } from '@aelea/ui-components-theme'




interface MainMenu {
  parentRoute: Route
}

export default ({ parentRoute }: MainMenu) => component((
  [sampleRouteChange, routeChange]: Behavior<any, any>
) => {

  const guideRoute = parentRoute.create({ fragment: 'guide', title: 'Guide' })
  const examplesRoute = parentRoute.create({ fragment: 'examples', title: 'Examples' })

  const $seperator = $text(style({ color: theme.system, pointerEvents: 'none' }))('|')
  return [
    $row(layoutSheet.spacingSmall, style({ alignItems: 'center', placeContent: 'center' }))(

      // $Link({ $content: $text('Why?!'), href: '/drag-and-sort', route: guideRoute })({
      //   click: sampleLinkClick()
      // }),

      $Link({ $content: $text('Developer\'s Guide'), url: '/p/guide', route: guideRoute })({
        click: sampleRouteChange()
      }),
      $seperator,
      $Link({ $content: $text('Examples'), url: '/p/examples', route: examplesRoute })({
        click: sampleRouteChange()
      }),
      $seperator,

      $element('a')(stylePseudo(':hover', { fill: theme.primary }), layoutSheet.displayFlex, style({ padding: '0 4px' }), attr({ href: 'https://github.com/nissoh/aelea' }))(
        $icon({ $content: $github, width: 25, viewBox: `0 0 1024 1024` })
      ),

    ),


    { routeChange }
  ]
})


