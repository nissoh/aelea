import { style } from '../../core/combinator/style.js'
import { o } from '../../stream/index.js'

const stretch = style({
  position: 'absolute',
  top: '0',
  bottom: '0',
  right: '0',
  left: '0'
})
const flex = style({ flex: 1 })
const displayFlex = style({ display: 'flex' })
const row = o(displayFlex, style({ flexDirection: 'row' }))
const column = o(displayFlex, style({ flexDirection: 'column' }))
const rowFlex = o(row, flex)
const columnFlex = o(column, flex)

export const layoutSheet = {
  stretch,
  flex,
  displayFlex,
  row,
  column,
  rowFlex,
  columnFlex
}
