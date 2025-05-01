import { $custom, $node, style } from '../../dom/index.js'
import { pallete } from '../../ui-components-theme/globalState.js'
import { elevation2 } from '../style/designSheet.js'
import { layoutSheet } from '../style/layoutSheet.js'

export const $row = $custom('row')(layoutSheet.row)
export const $column = $custom('column')(layoutSheet.column)

export const $card = $column(
  elevation2,
  style({
    padding: '16px',
    backgroundColor: pallete.background,
  }),
)

export const $seperator = $node(
  style({
    minHeight: '1px',
    minWidth: '1px',
    background: pallete.foreground,
  }),
)()
