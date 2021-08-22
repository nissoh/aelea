import { style } from '@aelea/dom'
import { O } from '@aelea/core'

const stretch = style({
  position: 'absolute',
  top: '0',
  bottom: '0',
  right: '0',
  left: '0'
})


const spacingTiny = style({
  gap: '4px'
})

const spacingSmall = style({
  gap: '8px'
})

const spacing = style({
  gap: '16px'
})

const spacingBig = style({
  gap: '26px'
})



const flex = style({ flex: 1 })
const displayFlex = style({ display: 'flex' })
const row = O(displayFlex, style({ flexDirection: 'row' }))
const column = O(displayFlex, style({ flexDirection: 'column' }))
const rowFlex = O(row, flex)
const columnFlex = O(column, flex)


export default {
  stretch, spacingTiny, spacingSmall, spacing, spacingBig, flex, displayFlex, row, column, rowFlex, columnFlex
}