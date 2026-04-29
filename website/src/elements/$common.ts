import { $element, style, stylePseudo } from 'aelea/ui'
import { $ButtonIcon, $icon } from 'aelea/ui-components'
import { pallete } from 'aelea/ui-components-theme'
import { $trash } from './$icons'

export const $TrashBtn = $ButtonIcon({
  $content: $icon({ $content: $trash, width: '24px', viewBox: '0 0 24 24' })
})

export const $anchor = $element('a')(
  stylePseudo(':hover', { color: pallete.primary }),
  style({
    cursor: 'pointer',
    color: pallete.message
  })
)
