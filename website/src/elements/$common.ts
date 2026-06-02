import { $element, $node, $text, style, stylePseudo } from 'aelea/ui'
import { $ButtonIcon, $icon } from 'aelea/ui-components'
import { palette, text } from 'aelea/ui-components-theme'
import { $trash } from './$icons'

export const $TrashBtn = $ButtonIcon({
  $content: $icon({ $content: $trash, width: '24px', viewBox: '0 0 24 24' })
})

export const $anchor = $element('a')(
  stylePseudo(':hover', { color: palette.primary }),
  style({
    cursor: 'pointer',
    color: palette.message
  })
)

export const $eyebrow = (label: string) =>
  $node(
    style({
      color: palette.foreground,
      fontSize: text.xs,
      letterSpacing: '0.18em',
      textTransform: 'uppercase'
    })
  )($text(label))

export const $h2 = (label: string) =>
  $element('h2')(style({ margin: '0', fontWeight: 500, fontSize: text.xxl, color: palette.message }))($text(label))

export const $muted = (...content: string[]) =>
  $node(style({ color: palette.foreground, lineHeight: '1.6' }))($text(content.join('')))

export const $code = (snippet: string) =>
  $node(
    style({
      fontFamily: 'inherit',
      backgroundColor: palette.horizon,
      border: `1px solid ${palette.middleground}`,
      borderRadius: '6px',
      padding: '10px 14px',
      color: palette.message,
      whiteSpace: 'pre',
      overflowX: 'auto'
    })
  )($text(snippet))
