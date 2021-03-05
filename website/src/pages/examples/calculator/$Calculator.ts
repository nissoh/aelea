
import { $node, $text, Behavior, component, O, style } from '@aelea/core'
import { $column, $Input, $row, layoutSheet } from '@aelea/ui-components'
import { theme } from '@aelea/ui-components-theme'
import { combine, empty, map, startWith } from '@most/core'
import $NumberTicker from '../../../components/$NumberTicker'


const add = (x: number, y: number) => x + y


const extractValue = O(
  map((str: string) => Number(str)),
  startWith(0)
)

const $plus = $node(
  style({
    justifyContent: 'center', alignItems: 'center',
    width: '36px', color: theme.system
  }),
  layoutSheet.displayFlex
)

export default component((
  [sampleX, x]: Behavior<string, number>,
  [sampleY, y]: Behavior<string, number>
) =>
  [
    $column(layoutSheet.spacingSmall)(

      $row(
        $plus(
          $text('+')
        ),
        $column(
          $Input({ value: empty(), placeholder: '0' })({
            change: sampleX(extractValue)
          }),
          $Input({ value: empty(), placeholder: '0' })({
            change: sampleY(extractValue)
          })
        )
      ),

      $row(
        $node(style({ width: '36px' }))(),
        $NumberTicker({
          value$: combine(add, x, y),
          decrementColor: theme.negative,
          incrementColor: theme.positive,
          slots: 30
        })
      )

    )
  ]
)


