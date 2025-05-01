import { O } from "../../core/common.js"
import { style } from "../../dom/combinators/style.js"

export const stretch = style({
  position: 'absolute',
  top: '0',
  bottom: '0',
  right: '0',
  left: '0'
})





export const flex = style({ flex: 1 })
export const displayFlex = style({ display: 'flex' })
export const row = O(displayFlex, style({ flexDirection: 'row' }))
export const column = O(displayFlex, style({ flexDirection: 'column' }))
export const rowFlex = O(row, flex)
export const columnFlex = O(column, flex)

