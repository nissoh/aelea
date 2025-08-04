import { $node, $text, attr, component, style } from 'aelea/core'
import { combineMap, empty, type IBehavior, map, o, startWith } from 'aelea/stream'
import { $column, $Field, $NumberTicker, $row, spacing } from 'aelea/ui-components'
import { pallete } from 'aelea/ui-components-theme'

const add = (x: number, y: number) => x + y

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
export default component(([x, XTether]: IBehavior<string, number>, [y, YTether]: IBehavior<string, number>) => [
  $column(spacing.small)(
    $row(
      $plus($text('+')),
      $column(spacing.tiny)(
        $Field({ value: empty, inputOp: placeholderZero })({
          change: XTether(extractValue)
        }),
        $Field({ value: empty, inputOp: placeholderZero })({
          change: YTether(extractValue)
        })
      )
    ),

    $row(
      $node(style({ width: '36px' }))(),
      $NumberTicker({
        value: combineMap(add, x, y),
        decrementColor: pallete.negative,
        incrementColor: pallete.positive,
        slots: 30
      })
    )
  )
])
