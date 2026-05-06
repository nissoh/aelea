import type { I$Node } from 'aelea/ui'
import { $element, $node, $text, component, style } from 'aelea/ui'
import { $card, $column, $row, designSheet, layoutSheet, spacing } from 'aelea/ui-components'
import type { Palette, Theme } from 'aelea/ui-components-theme'
import { text, themeList } from 'aelea/ui-components-theme'

function getPalette(theme: Palette, name: string, colors: [name: string, color: string][]): I$Node {
  const rows: I$Node[] = colors.map(([colorName, color]): I$Node => {
    const swatch = $node(style({ width: '30px', height: '30px', backgroundColor: color }))()
    const hex = $node(style({ flex: 1, color: theme.foreground, fontSize: text.xs }))($text(color))
    const label = $node(style({ flex: 1 }))($text(colorName))
    // Overload-selection in the current TS (tsgo preview) mis-picks the
    // op pipeline for this shape; cast to the expected leafs-result.
    return $row(spacing.default, style({ height: '30px', alignItems: 'center' }))(
      swatch,
      hex,
      label
    ) as unknown as I$Node
  })
  return $column(spacing.tiny)($text(name), ...rows)
}

export const $Palette = (themeDef: Theme) =>
  component(() => {
    const palette = Object.entries(themeDef.palette)
    const theme = themeDef.palette

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
        $element('p')(style({ fontSize: text.xl }))($text(themeDef.name)),
        getPalette(theme, 'Action', palette.slice(0, 1)),
        getPalette(theme, 'Story', palette.slice(1, 2)),
        getPalette(theme, 'Landscape', palette.slice(2, 6)),
        getPalette(theme, 'Attention', palette.slice(6, 9))
      )
    ]
  })

export const $Theme = component(() => {
  return [
    $row(spacing.big)(
      ...themeList.map(themeDef => {
        return $Palette(themeDef)({})
      })
    )
  ]
})
