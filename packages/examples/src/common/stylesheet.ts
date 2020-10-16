

import { style, O } from 'fufu'

// https://material.io/resources/color/#!/?view.left=1&view.right=1&primary.color=dd274b&secondary.color=4a5c63

export enum primary {
  f05 = 'rgb(252 227 232)',
  f10 = 'rgb(247 185 198)',
  f20 = 'rgb(241 141 162)',
  f30 = 'rgb(234 96 126)',
  f40 = 'rgb(228 65 100)',
  f50 = 'rgb(221 39 75)',
  f60 = 'rgb(205 34 74)',
  f70 = 'rgb(184 29 70)',
  f80 = 'rgb(164 23 68)',
  f90 = 'rgb(129 14 62)'
}

export enum system {
  f00 = 'rgb(255 255 255)',
  f05 = 'rgb(239 239 239)',
  f10 = 'rgb(211 216 218)',
  f20 = 'rgb(195 207 212)',
  f30 = 'rgb(149 166 172)',
  f40 = 'rgb(125 146 155)',
  f50 = 'rgb(101 127 138)',
  f60 = 'rgb(89 112 121)',
  f70 = 'rgb(74 92 99)',
  f80 = 'rgb(60 73 78)',
  f90 = 'rgb(43 52 55)',
  f99 = 'rgb(255 255 255)'
}



export const theme = {
  text: system.f00 as system.f00,
  system: system.f20 as system.f20,
  primary: primary.f30 as primary.f30,
  base: system.f20 as system.f20,
  baseLight: system.f70 as system.f70,
  baseDark: system.f90 as system.f90,
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
  fontSize: '1rem',
  // fontSize: '16px',
})

export const main = O(
  text,
  style({
    height: '100vh',
    overflow: 'auto',
    color: theme.text,
    backgroundColor: theme.baseDark,
    margin: '0',
    display: 'flex',
    flexDirection: 'column',
  }),
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
