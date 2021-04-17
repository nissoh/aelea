import { $element, $text, attr, Behavior, component, style, stylePseudo } from '@aelea/core'
import { $icon, $row, layoutSheet } from '@aelea/ui-components'
import { $Link } from '../components/$Link'
import { $github } from '../elements/$icons'
import { Route } from '@aelea/router'
import { pallete } from '@aelea/ui-components-theme'




interface MainMenu {
  parentRoute: Route
}

export default ({ parentRoute }: MainMenu) => component((
  [sampleRouteChange, routeChange]: Behavior<string, string>
) => {

  const guideRoute = parentRoute.create({ fragment: 'guide', title: 'Guide' })
  const examplesRoute = parentRoute.create({ fragment: 'examples', title: 'Examples' })

  const $seperator = $text(style({ color: pallete.description, pointerEvents: 'none' }))('|')
  return [
    $row(layoutSheet.spacingSmall, style({ alignItems: 'center', placeContent: 'center' }))(

      // $Link({ $content: $text('Why?!'), href: '/drag-and-sort', route: guideRoute })({
      //   click: sampleLinkClick()
      // }),

      $Link({ $content: $text('Developer\'s Guide'), url: '/p/guide', route: guideRoute })({
        click: sampleRouteChange()
      }),
      $seperator,
      $Link({ $content: $text('Examples'), url: '/p/examples/theme', route: examplesRoute })({
        click: sampleRouteChange()
      }),
      $seperator,

      $element('a')(stylePseudo(':hover', { fill: pallete.primary }), layoutSheet.displayFlex, style({ padding: '0 4px' }), attr({ href: 'https://github.com/nissoh/aelea' }))(
        $icon({ $content: $github, width: 25, viewBox: `0 0 1024 1024` })
      ),

    ),


    { routeChange }
  ]
})


