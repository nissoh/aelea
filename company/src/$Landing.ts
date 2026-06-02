import { $element, $node, $text, style } from 'aelea/ui'
import { $column } from 'aelea/ui-components'
import { palette, text } from 'aelea/ui-components-theme'
import { $employees } from './$Employees'

const MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace"

const $content = $column(
  style({
    position: 'relative',
    zIndex: 1,
    width: '100%',
    minHeight: '100vh',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: '30px',
    padding: '40px clamp(28px, 6vw, 96px)',
    textAlign: 'left'
  })
)(
  $element('h1')(
    style({
      margin: '0',
      fontWeight: 600,
      fontSize: 'clamp(2rem, 6vw, 4rem)',
      lineHeight: '1.06',
      letterSpacing: '0.01em',
      whiteSpace: 'pre-line',
      color: palette.message
    })
  )($text('Chicken Egg\nChicken Installers')),

  $node(style({ width: '44px', height: '1px', backgroundColor: palette.primary }))(),

  $node(
    style({
      maxWidth: '440px',
      fontSize: text.xl,
      fontStyle: 'italic',
      lineHeight: '1.6',
      color: palette.foreground
    })
  )($text('We installs. Every terminus, a substrate; every beginning, already begun.')),

  $node(
    style({
      fontFamily: MONO,
      fontSize: text.xs,
      letterSpacing: '0.3em',
      textTransform: 'uppercase',
      color: palette.foreground,
      opacity: 0.7
    })
  )($text('Please, recur.'))
)

export const $Landing = $node(style({ position: 'relative', width: '100%', minHeight: '100vh', overflow: 'hidden' }))(
  $employees,
  $content
)
