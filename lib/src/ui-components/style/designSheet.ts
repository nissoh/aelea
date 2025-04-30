import { O } from '../../core/common.js'
import { style, stylePseudo } from '../../dom/index.js'
import { pallete } from '../../ui-components-theme/globalState.js'

export const isFirefox =
  navigator.userAgent.toLowerCase().indexOf('firefox') > -1

const text = style({
  fontFamily: 'inherit',
  fontWeight: 100,
  fontSize: '1.15rem',
})
const customScroll = isFirefox
  ? style({ scrollbarColor: `${pallete.foreground} transparent` })
  : O(
      stylePseudo('::-webkit-scrollbar-thumb:hover', {
        backgroundColor: pallete.primary,
      }),
      stylePseudo('::-webkit-scrollbar-thumb', {
        backgroundColor: pallete.foreground,
      }),
      stylePseudo('::-webkit-scrollbar', {
        backgroundColor: 'transparent',
        width: '6px',
        height: '6px',
      }),
    )

const control = O(
  text,
  style({
    border: '2px solid transparent',
    color: pallete.message,
    outline: 'none',
    flexShrink: 0,
  }),
)

const main = O(
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
    display: 'block',
  }),
  customScroll,
)

const input = O(
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
    marginTop: '2px',
  }),
  stylePseudo('::placeholder', {
    color: pallete.foreground,
  }),
)

const btn = O(
  control,
  style({
    cursor: 'pointer',
    backgroundColor: 'transparent',
    border: `2px solid ${pallete.message}`,
    color: pallete.message,
    padding: '5px 15px',
    display: 'flex',
    alignItems: 'center',
  }),
)

export const designSheet = {
  main,
  customScroll,
  text,
  input,
  btn,
  control,
}
