

import { style, O, stylePseudo } from '@aelea/core'


export enum theme {
  text = 'rgb(255 255 255)',
  system = 'rgb(195 207 212)',
  primary = 'rgb(234 96 126)',
  base = 'rgb(201 222 230)',
  baseLight = 'rgb(74 92 99)',
  baseDark = 'rgb(43 52 55)',
}


export enum themeAttention {
  positive = '#a6f5a6',
  negative = '#ff9393',
}


export const flex = style({ flex: 1 })
export const displayFlex = style({ display: 'flex' })
export const row = O(displayFlex, style({ flexDirection: 'row' }))
export const column = O(displayFlex, style({ flexDirection: 'column' }))
export const rowFlex = O(row, flex)
export const columnFlex = O(column, flex)



export const text = style({
  fontFamily: 'Fira Code',
  fontWeight: 100,
  fontSize: '1rem'
})

export const customScroll = O(
  stylePseudo('::-webkit-scrollbar-thumb', {
    backgroundColor: theme.baseLight
  }),
  stylePseudo('::-webkit-scrollbar', {
    backgroundColor: 'transparent'
  })
)

export const main = O(
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
)


export const control = O(
  text,
  style({
    border: '2px solid transparent',
    color: 'white',
    outline: 'none',
    flexShrink: 0,
  })
)

export const input = O(
  control,
  style({
    minWidth: '100px',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: `2px solid ${theme.system}`,
    padding: '8px 0px 4px',
    flex: 1,
  }),
  stylePseudo('::placeholder', {
    color: theme.system
  })
)


export const btn = O(
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

export const stretch = style({
  position: 'absolute',
  top: '0',
  bottom: '0',
  right: '0',
  left: '0'
})

export const spacingSmall = style({
  gap: '8px'
})

export const spacing = style({
  gap: '16px'
})

export const spacingBig = style({
  gap: '26px'
})


export const visuallyHidden = style({
  border: '0',
  clip: 'rect(0 0 0 0)',
  height: '1px',
  margin: '-1px',
  overflow: 'hidden',
  padding: '0',
  position: 'absolute',
  width: '1px',
  outline: '0',
})
