
import { $node, $text, component, style } from '@aelea/dom'
import { $card, $column, $row, elevation2, layoutSheet } from '@aelea/ui-components'
import { Pallete, Theme } from '@aelea/ui-components-theme'
import { dark, light } from '../../../common/theme'



function getPallete(theme: Pallete, name: string, colors: [name: string, color: string][]) {
  return $column(layoutSheet.spacingTiny)(
    $text(name),

    ...colors.map(([name, color]) =>
      $row(layoutSheet.spacing, style({ height: '30px', alignItems: 'center' }))(
        $node(style({ width: '30px', height: '30px', backgroundColor: color }))(),
        $text(style({ flex: 1, color: theme.foreground, fontSize: '12px' }))(color),
        $text(style({ flex: 1 }))(name),
      )
    )
  )
}

export const $Pallete = (themeDef: Theme) => component(() => {
  const pallete = Object.entries(themeDef.pallete)
  const theme = themeDef.pallete

  return [
    $card(layoutSheet.spacingBig, layoutSheet.flex, elevation2, style({ color: theme.message, padding: '15px', backgroundColor: theme.background }))(
      $text(style({ fontSize: '120%' }))(themeDef.name),
      getPallete(theme, 'Action', pallete.slice(0, 1)),
      getPallete(theme, 'Story', pallete.slice(1, 2)),
      getPallete(theme, 'Landscape', pallete.slice(2, 6)),
      getPallete(theme, 'Attention', pallete.slice(6, 9)),
    )
  ]
})

export const $Theme = component((
) => {
  

  return [
    $row(layoutSheet.spacingBig)(
      ...[dark, light].map(themeDef => {
        return $Pallete(themeDef)({})
      })
    )
  ]
})


