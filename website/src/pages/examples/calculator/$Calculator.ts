
import { $node, $text, Behavior, component, O, style } from '@aelea/core'
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
    width: '36px', color: pallete.description
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
        $column(layoutSheet.spacingTiny)(
          $Field({ change: empty(), placeholder: '0' })({
            change: sampleX(extractValue)
          }),
          $Field({ change: empty(), placeholder: '0' })({
            change: sampleY(extractValue)
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


