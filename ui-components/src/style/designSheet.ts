

import { style, O, stylePseudo } from '@aelea/core'
import { pallete } from '@aelea/ui-components-theme'

const text = style({
  fontFamily: `'Nunito', Fira Code`,
  fontWeight: 100,
  fontSize: '1.15rem'
})
const customScroll = O(
  stylePseudo('::-webkit-scrollbar-thumb', {
    backgroundColor: pallete.foreground
   
  }),
  stylePseudo('::-webkit-scrollbar', {
    backgroundColor: 'transparent',
    width: '6px',
    height: '6px'
  }),
  stylePseudo('::-webkit-scrollbar-thumb:hover', {
    backgroundColor: pallete.primary
  }),
)

const control = O(
  text,
  style({
    border: '2px solid transparent',
    color: pallete.message,
    outline: 'none',
    flexShrink: 0,
  })
)

export default {
  customScroll,
  text,
  main: O(
    text,
    style({
      height: '100vh',
      color: pallete.message,
      fill: pallete.message,
      overflowY: 'scroll',
      backgroundColor: pallete.background,
      margin: '0',
      scrollbarColor: 'auto',
      scrollbarWidth: 'thin',
      display: 'block'
    }),
    customScroll
  ),
  control,
  input: O(
    control,
    style({
      minWidth: '100px',
      backgroundColor: 'transparent',
      border: 'none',
      borderBottom: `2px solid ${pallete.message}`,
      paddingBottom: '2px',
      flex: 1,
      padding: 0,
      marginTop: '2px'
    }),
    stylePseudo('::placeholder', {
      color: pallete.foreground
    })
  ),
  btn: O(
    control,
    style({
      cursor: 'pointer',
      backgroundColor: 'transparent',
      border: `2px solid ${pallete.message}`,
      color: pallete.message,
      padding: '5px 15px',
      display: 'flex',
      alignItems: 'center',
    })
  )

}













