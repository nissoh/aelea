import { o } from '../../stream/index.js'
import { style, stylePseudo } from '../../ui/index.js'
import { pallete } from '../../ui-components-theme/globalState.js'

export const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1

const text = style({
  fontFamily: 'inherit',
  fontWeight: 100,
  fontSize: '1.15rem'
})
const customScroll = isFirefox
  ? style({ scrollbarColor: `${pallete.foreground} transparent` })
  : o(
      stylePseudo('::-webkit-scrollbar-thumb:hover', {
        backgroundColor: pallete.primary
      }),
      stylePseudo('::-webkit-scrollbar-thumb', {
        backgroundColor: pallete.foreground
      }),
      stylePseudo('::-webkit-scrollbar', {
        backgroundColor: 'transparent',
        width: '6px',
        height: '6px'
      })
    )

const control = o(
  text,
  style({
    border: '2px solid transparent',
    color: pallete.message,
    outline: 'none',
    flexShrink: 0
  })
)

const main = o(
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
)

const input = o(
  control,
  style({
    minWidth: '25px',
    width: '100%',
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
)

const btn = o(
  control,
  style({
    cursor: 'pointer',
    backgroundColor: 'transparent',
    border: `2px solid ${pallete.message}`,
    color: pallete.message,
    padding: '5px 15px',
    display: 'flex',
    alignItems: 'center'
  })
)

export const elevation1 = style({ border: `1px solid ${pallete.horizon}` })
export const elevation2 = style({
  boxShadow: '0px 1px 1px rgba(0, 0, 0, 0.14), 0px 2px 1px rgba(0, 0, 0, 0.12), 0px 1px 3px rgba(0, 0, 0, 0.2)'
})
export const elevation3 = style({
  boxShadow: '0px 2px 2px rgba(0, 0, 0, 0.14), 0px 3px 1px rgba(0, 0, 0, 0.12), 0px 1px 5px rgba(0, 0, 0, 0.2)'
})
export const elevation4 = style({
  boxShadow: '0px 3px 4px rgba(0, 0, 0, 0.14), 0px 3px 3px rgba(0, 0, 0, 0.12), 0px 1px 8px rgba(0, 0, 0, 0.2)'
})
export const elevation6 = style({
  boxShadow: '0px 6px 10px rgba(0, 0, 0, 0.14), 0px 1px 18px rgba(0, 0, 0, 0.12), 0px 3px 5px rgba(0, 0, 0, 0.2)'
})
export const elevation12 = style({
  boxShadow: '0px 12px 17px rgba(0, 0, 0, 0.14), 0px 5px 22px rgba(0, 0, 0, 0.12), 0px 7px 8px rgba(0, 0, 0, 0.2)'
})

export const designSheet = {
  main,
  customScroll,
  text,
  input,
  btn,
  control,
  elevation1,
  elevation2,
  elevation3,
  elevation4,
  elevation6,
  elevation12
}
