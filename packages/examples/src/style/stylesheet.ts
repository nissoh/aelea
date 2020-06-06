

import { style, O } from 'fufu'



export const flex = style({ flex: 1 })
export const displayFlex = style({ display: 'flex' })
export const row = O(displayFlex, style({ flexDirection: 'row' }))
export const column = O(displayFlex, style({ flexDirection: 'column' }))
export const rowFlex = O(row, flex)
export const columnFlex = O(column, flex)


export const main = style({
  fontFamily: 'Fira Code',
  fontWeight: 100,
  lineHeight: 1
})

export const input = O(
  main,
  style({
    minWidth: '100px',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '1px solid rgb(210, 210, 210, 0.4)',
    fontWeight: 100,
    padding: '8px 0px 4px',
    outline: 'none',
    fontSize: '1rem',
    color: '#ffffff',
    cursor: 'text'
  })
)





// Common UI elements
const button = style({
  cursor: 'pointer',
  outline: '0',
  border: 'none',
  fontSize: '1rem'
})

export const btn = O(
  button,
  style({
    backgroundColor: 'transparent',
    border: '1px solid #8a9946',
    color: '#ffffff',
    padding: '5px 15px'
  })
)

