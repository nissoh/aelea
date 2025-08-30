import { combine, empty, map, o, start } from 'aelea/stream'
import type { IBehavior } from 'aelea/stream-extended'
import { $node, $text, attr, component, style } from 'aelea/ui'
import { $column, $Field, $NumberTicker, $row, spacing } from 'aelea/ui-components'
import { pallete } from 'aelea/ui-components-theme'

const extractValue = o(
  map((str: string) => Number(str)),
  start(0)
)

const $plus = $node(
  style({
    justifyContent: 'center',
    alignItems: 'center',
    width: '36px',
    color: pallete.foreground,
    display: 'flex'
  })
)

const placeholderZero = attr({ placeholder: '0' })
export default component(([n1, n1Tether]: IBehavior<string, number>, [n2, n2Tether]: IBehavior<string, number>) => [
  $column(spacing.small)(
    $row(
      $plus($text('+')),
      $column(spacing.tiny)(
        $Field({ value: empty, inputOp: placeholderZero })({
          change: n1Tether(extractValue)
        }),
        $Field({ value: empty, inputOp: placeholderZero })({
          change: n2Tether(extractValue)
        })
      )
    ),

    $row(
      $node(style({ width: '36px' }))(),
      $NumberTicker({
        value: map(params => params.n1 + params.n2, combine({ n1, n2 })),
        slots: 30
      })
    )
  )
])
