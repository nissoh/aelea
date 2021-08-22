import { $custom, $node, style } from '@aelea/dom'
import { pallete } from '@aelea/ui-components-theme'
import layoutSheet from '../style/layoutSheet'


export const $row = $custom('row')(layoutSheet.row)
export const $column = $custom('column')(layoutSheet.column)



export const elevation1 = style({ border: `1px solid ${pallete.horizon}` })
export const elevation2 = style({ boxShadow: '0px 1px 1px rgba(0, 0, 0, 0.14), 0px 2px 1px rgba(0, 0, 0, 0.12), 0px 1px 3px rgba(0, 0, 0, 0.2)', })
export const elevation3 = style({ boxShadow: '0px 2px 2px rgba(0, 0, 0, 0.14), 0px 3px 1px rgba(0, 0, 0, 0.12), 0px 1px 5px rgba(0, 0, 0, 0.2)', })
export const elevation4 = style({ boxShadow: '0px 3px 4px rgba(0, 0, 0, 0.14), 0px 3px 3px rgba(0, 0, 0, 0.12), 0px 1px 8px rgba(0, 0, 0, 0.2)', })
export const elevation6 = style({ boxShadow: '0px 6px 10px rgba(0, 0, 0, 0.14), 0px 1px 18px rgba(0, 0, 0, 0.12), 0px 3px 5px rgba(0, 0, 0, 0.2)', })
export const elevation12 = style({ boxShadow: '0px 12px 17px rgba(0, 0, 0, 0.14), 0px 5px 22px rgba(0, 0, 0, 0.12), 0px 7px 8px rgba(0, 0, 0, 0.2)', })



export const $card = $column(elevation2, style({
  padding: '16px',
  backgroundColor: pallete.background,
}))


export const $seperator = $node(
  style({
    minHeight: '1px',
    minWidth: '1px',
    background: pallete.foreground
  })
)()


