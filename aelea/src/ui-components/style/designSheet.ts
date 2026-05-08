import { o } from '../../stream/index.js'
import { palette, text } from '../../ui-components-theme/index.js'
import { style, stylePseudo } from '../../ui-renderer-dom/index.js'

export const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1

const customScroll = isFirefox
  ? style({ scrollbarColor: `${palette.foreground} transparent` })
  : o(
      stylePseudo('::-webkit-scrollbar-thumb:hover', {
        backgroundColor: palette.primary
      }),
      stylePseudo('::-webkit-scrollbar-thumb', {
        backgroundColor: palette.foreground
      }),
      stylePseudo('::-webkit-scrollbar', {
        backgroundColor: 'transparent',
        width: '6px',
        height: '6px'
      })
    )

const main = o(
  style({
    fontFamily: 'inherit',
    fontWeight: 300,
    fontSize: text.base,
    height: '100vh',
    color: palette.message,
    fill: palette.message,
    overflowY: 'scroll',
    backgroundColor: palette.background,
    margin: '0',
    scrollbarColor: 'auto',
    scrollbarWidth: 'thin',
    display: 'block'
  }),
  customScroll
)

export const elevation2 = style({
  boxShadow: '0px 1px 1px rgba(0, 0, 0, 0.14), 0px 2px 1px rgba(0, 0, 0, 0.12), 0px 1px 3px rgba(0, 0, 0, 0.2)'
})

export const designSheet = {
  main,
  customScroll,
  elevation2
}
