
import { $node, $text, attr, component, style } from 'aelea/dom'
import { Behavior, O } from '@aelea/core'
import { $column, $Field, $NumberTicker, $row, layoutSheet } from '@aelea/ui-components'
import { pallete } from '@aelea/ui-components-theme'
import { combine, empty, map, startWith } from '@most/core'


const add = (x: number, y: number) => x + y


const extractValue = O(
  map((str: string) => Number(str)),
  startWith(0)
)

const $plus = $node(
  style({
    justifyContent: 'center', alignItems: 'center',
    width: '36px', color: pallete.foreground
  }),
  spacing.displayFlex
)

const placeholderZero = attr({ placeholder: '0' })
export default component((
  [x, XTether]: Behavior<string, number>,
  [y, YTether]: Behavior<string, number>
) =>
  [
    $column(spacing.small)(

      $row(
        $plus(
          $text('+')
        ),
        $column(spacing.tiny)(
          $Field({ value: empty(), inputOp: placeholderZero })({
            change: XTether(extractValue)
          }),
          $Field({ value: empty(), inputOp: placeholderZero })({
            change: YTether(extractValue)
          })
        )
      ),

      $row(
        $node(style({ width: '36px' }))(),
        $NumberTicker({
          value$: combine(add, x, y),
          decrementColor: pallete.negative,
          incrementColor: pallete.positive,
          slots: 30
        })
      )

    )
  ]
)


