

import { constant } from '@most/core'
import { style, domEvent, styleBehaviour } from '@fufu/core'
import { pipe } from './utils'


export const centerStyle =  style({ alignItems: 'center', justifyContent: 'center' })

export const flex =         style({ flex: 1 })
export const displayFlex =  style({ display: 'flex' })
export const row =          pipe(displayFlex, style({ flexDirection: 'row' }))
export const column =       pipe(displayFlex, style({ flexDirection: 'column' }))
export const rowFlex =      pipe(row, flex)
export const columnFlex =   pipe(column, flex)



const fontFamily = 'Fira Code'
export const main =         pipe(row, style({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  fontFamily
}))

export const input = pipe(row, style({
  minWidth: '100px',
  backgroundColor: 'transparent',
  border: 'none',
  borderBottom: '1px dotted rgb(0, 0, 0)',
  fontWeight: '100',
  padding: '15px',
  margin: '0 10px',
  fontFamily,
  outline: 0,
  fontSize: '18px',
  cursor: 'text'
}))

export const centerFlex =    pipe(row, centerStyle)

export const focusBgRedStyle =      styleBehaviour(pipe(domEvent('focus'), constant({background: '#f1f1f1'})))
export const blurNoneStyle =        styleBehaviour(pipe(domEvent('blur'),  constant({background: ''})))

export const mainCentered =  pipe(main, pipe(column, centerStyle))
export const inputStyle =    pipe(rowFlex, input)

export const inputStyleBehaviour = pipe(inputStyle, pipe(focusBgRedStyle, blurNoneStyle))


// Common UI elements
const button =  style({
  outline: 0,
  border: 0,
  cursor: 'pointer'
})

export const btn =  pipe(button, style({
  backgroundColor: '#000000',
  borderRadius: '5px',
  color: '#ffffff',
  padding: '5px 15px',
  fontSize: '18px'
}))


