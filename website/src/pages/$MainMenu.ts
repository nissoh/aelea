import { $element, $node, $text, attr, component, style, stylePseudo } from 'aelea/ui'
import { $icon, $row, spacing } from 'aelea/ui-components'
import { palette } from 'aelea/ui-components-theme'
import { $Link } from 'aelea/ui-router'
import { $github } from '../elements/$icons'
import { routeSchema } from '../route'

export default () =>
  component(() => {
    const $separator = $node(style({ color: palette.foreground, pointerEvents: 'none' }))($text('|'))

    return [
      $row(spacing.small, style({ alignItems: 'center', placeContent: 'center' }))(
        $Link({
          $content: $text("Developer's Guide"),
          route: routeSchema.pages.guide
        })({}),
        $separator,
        $Link({
          $content: $text('Controllers'),
          route: routeSchema.pages.examples.controllers
        })({}),
        $separator,
        $Link({
          $content: $text('Examples'),
          route: routeSchema.pages.examples.theme
        })({}),
        $separator,

        $element('a')(
          stylePseudo(':hover', { fill: palette.primary }),
          style({ padding: '0 4px', display: 'flex' }),
          attr({ href: 'https://github.com/nissoh/aelea' })
        )($icon({ $content: $github, width: '25px', viewBox: '0 0 1024 1024' }))
      )
    ]
  })
