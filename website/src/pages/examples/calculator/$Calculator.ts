import { $node, $text, attr, component, style } from 'aelea/core'
import { combine, empty, type IBehavior, map, o, startWith } from 'aelea/stream'
import { $column, $Field, $NumberTicker, $row, spacing } from 'aelea/ui-components'
import { pallete } from 'aelea/ui-components-theme'

const extractValue = o(
  map((str: string) => Number(str)),
  startWith(0)
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
        decrementColor: pallete.negative,
        incrementColor: pallete.positive,
        slots: 30
      })
    )
  )
])
