import { O } from '../../core/common.js'
import { style } from '../../core/combinator/style.js'

const stretch = style({
  position: 'absolute',
  top: '0',
  bottom: '0',
  right: '0',
  left: '0'
})
const flex = style({ flex: 1 })
const displayFlex = style({ display: 'flex' })
const row = O(displayFlex, style({ flexDirection: 'row' }))
const column = O(displayFlex, style({ flexDirection: 'column' }))
const rowFlex = O(row, flex)
const columnFlex = O(column, flex)

export const layoutSheet = {
  stretch,
  flex,
  displayFlex,
  row,
  column,
  rowFlex,
  columnFlex
}
