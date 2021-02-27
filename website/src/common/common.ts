import { $custom, $node, Behavior, component, O, style, styleBehavior, StyleCSS } from '@aelea/core'
import { $Anchor, IAnchor } from '@aelea/router/src/components/$Anchor'
import { combine } from '@most/core'
import $ButtonIcon from '../components/form/$ButtonIcon'
import { $trash } from '../components/form/$icon'
import * as designSheet from './stylesheet'


export const $main = $node(designSheet.main)

export const $row = $custom('row')(designSheet.row)
export const $column = $custom('column')(designSheet.column)

export const $card = $column(style({
  padding: '16px',
  backgroundColor: designSheet.theme.baseLight,
  boxShadow: '10px 10px 0px -6px rgba(0, 0, 0, .25)',
}))

export const $mainCard = $card(designSheet.spacingBig, style({ width: '400px', margin: '0 auto' }))

export const $seperator = $node(
  style({
    minHeight: '1px',
    minWidth: '1px',
    background: designSheet.theme.baseDark
  })
)()

export const $TrashBtn = $ButtonIcon($trash)

