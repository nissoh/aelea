import { $element, $node, $text, attr, component, style, stylePseudo } from 'aelea/ui'
import { $icon, $row, spacing } from 'aelea/ui-components'
import { pallete } from 'aelea/ui-components-theme'
import { $Link } from 'aelea/ui-router'
import { $github } from '../elements/$icons'
import { routeSchema } from '../route'

export default () =>
  component(() => {
    const $seperator = $node(style({ color: pallete.foreground, pointerEvents: 'none' }))($text('|'))

    return [
      $row(spacing.small, style({ alignItems: 'center', placeContent: 'center' }))(
        $Link({
          $content: $text("Developer's Guide"),
          route: routeSchema.pages.guide
        })({}),
        $seperator,
        $Link({
          $content: $text('Controllers'),
          route: routeSchema.pages.examples.controllers
        })({}),
        $seperator,
        $Link({
          $content: $text('Examples'),
          route: routeSchema.pages.examples.theme
        })({}),
        $seperator,

        $element('a')(
          stylePseudo(':hover', { fill: pallete.primary }),
          style({ padding: '0 4px', display: 'flex' }),
          attr({ href: 'https://github.com/nissoh/aelea' })
        )($icon({ $content: $github, width: '25px', viewBox: '0 0 1024 1024' }))
      )
    ]
  })
