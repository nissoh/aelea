import type { IBehavior } from 'aelea/core'
import { $element, $node, $p, $text, attr, component, style, stylePseudo } from 'aelea/core'
import type { Route } from 'aelea/router'
import { $icon, $row, spacing } from 'aelea/ui-components'
import { pallete } from 'aelea/ui-components-theme'
import { $Link } from '../components/$Link'
import { $github } from '../elements/$icons'

interface MainMenu {
  parentRoute: Route
}

export default ({ parentRoute }: MainMenu) =>
  component(([routeChange, routeChangeTether]: IBehavior<string, string>) => {
    const guideRoute = parentRoute.create({ fragment: 'guide', title: 'Guide' })
    const examplesRoute = parentRoute.create({
      fragment: 'examples',
      title: 'Examples'
    })

    const $seperator = $node(style({ color: pallete.foreground, pointerEvents: 'none' }))($text('|'))

    return [
      $row(spacing.small, style({ alignItems: 'center', placeContent: 'center' }))(
        // $Link({ $content: $text('Why?!'), href: '/drag-and-sort', route: guideRoute })({
        //   click: sampleLinkClick()
        // }),

        $Link({
          $content: $text("Developer's Guide"),
          url: '/p/guide',
          route: guideRoute
        })({
          click: routeChangeTether()
        }),
        $seperator,
        $Link({
          $content: $text('Examples'),
          url: '/p/examples/theme',
          route: examplesRoute
        })({
          click: routeChangeTether()
        }),
        $seperator,

        $element('a')(
          stylePseudo(':hover', { fill: pallete.primary }),
          style({ padding: '0 4px', display: 'flex' }),
          attr({ href: 'https://github.com/nissoh/aelea' })
        )($icon({ $content: $github, width: '25px', viewBox: '0 0 1024 1024' }))
      ),

      { routeChange }
    ]
  })
