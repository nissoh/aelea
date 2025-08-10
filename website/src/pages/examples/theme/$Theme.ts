import { $node, $p, $text, component, style } from 'aelea/ui'
import { $card, $column, $row, designSheet, layoutSheet, spacing } from 'aelea/ui-components'
import type { Pallete, Theme } from 'aelea/ui-components-theme'
import { themeList } from 'aelea/ui-components-theme'

function getPallete(theme: Pallete, name: string, colors: [name: string, color: string][]) {
  return $column(spacing.tiny)(
    $text(name),

    ...colors.map(([name, color]) =>
      $row(spacing.default, style({ height: '30px', alignItems: 'center' }))(
        $node(style({ width: '30px', height: '30px', backgroundColor: color }))(),
        $node(style({ flex: 1, color: theme.foreground, fontSize: '12px' }))($text(color)),
        $node(style({ flex: 1 }))($text(name))
      )
    )
  )
}

export const $Pallete = (themeDef: Theme) =>
  component(() => {
    const pallete = Object.entries(themeDef.pallete)
    const theme = themeDef.pallete

    return [
      $card(
        spacing.big,
        layoutSheet.flex,
        designSheet.elevation2,
        style({
          color: theme.message,
          padding: '15px',
          backgroundColor: theme.background
        })
      )(
        $p(style({ fontSize: '120%' }))($text(themeDef.name)),
        getPallete(theme, 'Action', pallete.slice(0, 1)),
        getPallete(theme, 'Story', pallete.slice(1, 2)),
        getPallete(theme, 'Landscape', pallete.slice(2, 6)),
        getPallete(theme, 'Attention', pallete.slice(6, 9))
      )
    ]
  })

export const $Theme = component(() => {
  return [
    $row(spacing.big)(
      ...themeList.map(themeDef => {
        return $Pallete(themeDef)({})
      })
    )
  ]
})
