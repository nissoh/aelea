
import { $node, $text, attr, Behavior, component, style } from '@aelea/core'
import { O } from '@aelea/utils'
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
  layoutSheet.displayFlex
)

const placeholderZero = attr({ placeholder: '0' })
export default component((
  [x, XTether]: Behavior<string, number>,
  [y, YTether]: Behavior<string, number>
) =>
  [
    $column(layoutSheet.spacingSmall)(

      $row(
        $plus(
          $text('+')
        ),
        $column(layoutSheet.spacingTiny)(
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


