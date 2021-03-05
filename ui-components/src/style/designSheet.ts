

import { style, O, stylePseudo } from '@aelea/core'
import { theme } from '@aelea/ui-components-theme'

const text = style({
  fontFamily: 'Fira Code',
  fontWeight: 100,
  fontSize: '1rem'
})

const customScroll = O(
  stylePseudo('::-webkit-scrollbar-thumb', {
    backgroundColor: theme.baseLight
  }),
  stylePseudo('::-webkit-scrollbar', {
    backgroundColor: 'transparent'
  })
)

const control = O(
  text,
  style({
    border: '2px solid transparent',
    color: 'white',
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
      overflowY: 'scroll',
      backgroundColor: theme.baseDark,
      margin: '0',
      scrollbarColor: 'auto',
      scrollbarWidth: 'thin',
      display: 'flex',
      flexDirection: 'column',
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
      color: theme.text,
      padding: '5px 15px',
      display: 'flex',
      alignItems: 'center',
    })
  )

}













