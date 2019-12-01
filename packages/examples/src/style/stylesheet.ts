

import { constant } from '@most/core'
import { style, domEvent } from 'fufu'
import { pipe } from '../utils'


export const centerStyle =  style({ alignItems: 'center', justifyContent: 'center' })

export const flex =         style({ flex: 1 })
export const displayFlex =  style({ display: 'flex' })
export const row =          pipe(displayFlex, style({ flexDirection: 'row' }))
export const column =       pipe(displayFlex, style({ flexDirection: 'column' }))
export const rowFlex =      pipe(row, flex)
export const columnFlex =   pipe(column, flex)


const fontFamily = 'Fira Code'
export const main =         style({
  position: 'absolute',
  top: '0',
  left: '0',
  right: '0',
  bottom: '0',
  fontFamily,
  justifyContent: 'center'
})

export const input = pipe(row, style({
  minWidth: '100px',
  backgroundColor: 'transparent',
  border: 'none',
  borderBottom: '1px solid rgb(210, 210, 210)',
  fontWeight: 'normal',
  padding: '8px 0',
  fontFamily,
  outline: 'none',
  fontSize: '18px',
  cursor: 'text'
}))

export const centerFlex =    pipe(row, centerStyle)

export const mainCentered =  pipe(main, pipe(column, centerStyle))
export const inputStyle =    pipe(rowFlex, input)



// export const inputStyleBehaviour = pipe(inputStyle, pipe(applyFocusStyle, applyBlurStyle))


// Common UI elements
const button =  style({
  border: 'ded',
  cursor: 'pointer'
})

export const btn =  pipe(button, style({
  backgroundColor: '#000000',
  borderRadius: '5px',
  color: '#ffffff',
  padding: '5px 15px',
  fontSize: '18px'
}))


