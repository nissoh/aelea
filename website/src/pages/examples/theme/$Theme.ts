import { $text, style, $node, component } from 'aelea/dom'
import { $column, spacing, $row, $card } from 'aelea/ui-components'
import { elevation2 } from '../../../../../lib/src/ui-components/elements/$elements'
import { flex } from '../../../../../lib/src/ui-components/style/layoutSheet'
import type { Pallete, Theme } from 'aelea/ui-components-theme'
import { themeList } from '../../../theme'

function getPallete(
  theme: Pallete,
  name: string,
  colors: [name: string, color: string][],
) {
  return $column(spacing.tiny)(
    $text(name),

    ...colors.map(([name, color]) =>
      $row(spacing.default, style({ height: '30px', alignItems: 'center' }))(
        $node(
          style({ width: '30px', height: '30px', backgroundColor: color }),
        )(),
        $text(style({ flex: 1, color: theme.foreground, fontSize: '12px' }))(
          color,
        ),
        $text(style({ flex: 1 }))(name),
      ),
    ),
  )
}

export const $Pallete = (themeDef: Theme) =>
  component(() => {
    const pallete = Object.entries(themeDef.pallete)
    const theme = themeDef.pallete

    return [
      $card(
        spacing.big,
        flex,
        elevation2,
        style({
          color: theme.message,
          padding: '15px',
          backgroundColor: theme.background,
        }),
      )(
        $text(style({ fontSize: '120%' }))(themeDef.name),
        getPallete(theme, 'Action', pallete.slice(0, 1)),
        getPallete(theme, 'Story', pallete.slice(1, 2)),
        getPallete(theme, 'Landscape', pallete.slice(2, 6)),
        getPallete(theme, 'Attention', pallete.slice(6, 9)),
      ),
    ]
  })

export const $Theme = component(() => {
  return [
    $row(spacing.big)(
      ...themeList.map((themeDef) => {
        return $Pallete(themeDef)({})
      }),
    ),
  ]
})
