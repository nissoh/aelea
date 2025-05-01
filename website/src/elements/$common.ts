import { $element, style, stylePseudo } from 'aelea/dom'
import { $ButtonIcon, $column, $row, spacing } from 'aelea/ui-components'
import { pallete } from 'aelea/ui-components-theme'
import { $trash } from './$icons'

export const $TrashBtn = $ButtonIcon($trash)

export const $card = $column(
  spacing.big,
  style({
    padding: '16px',
    backgroundColor: pallete.background,
    boxShadow:
      '0px 1px 1px rgba(0, 0, 0, 0.14), 0px 2px 1px rgba(0, 0, 0, 0.12), 0px 1px 3px rgba(0, 0, 0, 0.2)',
  }),
)

export const $alert = $row(
  style({
    fontSize: '75%',
    border: `1px solid ${pallete.negative}`,
    padding: '10px',
  }),
)

export const $anchor = $element('a')(
  stylePseudo(':hover', { color: pallete.primary }),
  style({
    cursor: 'pointer',
    color: pallete.message,
  }),
)
