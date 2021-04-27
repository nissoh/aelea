import { style } from "@aelea/core"
import { $ButtonIcon, $column, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { $trash } from "./$icons"

export const $TrashBtn = $ButtonIcon($trash)
export const $card = $column(layoutSheet.spacingBig, style({
  padding: '16px', backgroundColor: pallete.background,
  boxShadow: '0px 1px 1px rgba(0, 0, 0, 0.14), 0px 2px 1px rgba(0, 0, 0, 0.12), 0px 1px 3px rgba(0, 0, 0, 0.2)'
}))