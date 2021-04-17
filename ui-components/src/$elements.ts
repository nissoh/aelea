import { $custom, $node, style } from '@aelea/core'
import { pallete } from '@aelea/ui-components-theme'
import layoutSheet from './style/layoutSheet'


export const $row = $custom('row')(layoutSheet.row)
export const $column = $custom('column')(layoutSheet.column)

export const $card = $column(style({
  padding: '16px',
  backgroundColor: pallete.middleground,
  boxShadow: '10px 10px 0px -6px rgba(0, 0, 0, .25)',
}))

export const $mainCard = $card(layoutSheet.spacingBig, style({ width: '400px', margin: '0 auto' }))

export const $seperator = $node(
  style({
    minHeight: '1px',
    minWidth: '1px',
    background: pallete.description
  })
)()


