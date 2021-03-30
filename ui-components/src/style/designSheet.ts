

import { style, O, stylePseudo } from '@aelea/core'
import { theme } from '@aelea/ui-components-theme'

const text = style({
  fontFamily: `'Nunito', Fira Code`,
  fontWeight: 100,
  fontSize: '1.15rem'
})
const customScroll = O(
  stylePseudo('::-webkit-scrollbar-thumb', {
    backgroundColor: theme.middleground
  }),
  stylePseudo('::-webkit-scrollbar', {
    backgroundColor: 'transparent'
  })
)

const control = O(
  text,
  style({
    border: '2px solid transparent',
    color: theme.text,
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
      color: theme.text,
      fill: theme.foreground,
      overflowY: 'scroll',
      backgroundColor: theme.background,
      margin: '0',
      scrollbarColor: 'auto',
      scrollbarWidth: 'thin',
      display: 'flex'
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
      borderBottom: `1px solid ${theme.system}`,
      paddingBottom: '2px',
      flex: 1,
    }),
    stylePseudo('::placeholder', {
      color: theme.system
    })
  ),
  btn: O(
    control,
    style({
      cursor: 'pointer',
      backgroundColor: 'transparent',
      border: `2px solid ${theme.system}`,
      color: theme.foreground,
      padding: '5px 15px',
      display: 'flex',
      alignItems: 'center',
    })
  )

}













