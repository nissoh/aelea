
import { combine, empty, map, startWith } from '@most/core'
import { $node, $text, Behavior, component, O, style } from '@aelea/core'
import { $column, $row } from '../common/common'
import * as designSheet from '../common/stylesheet'
import $Input from './form/$Input'
import $NumberTicker from './$NumberTicker'


const add = (x: number, y: number) => x + y


const extractValue = O(
  map((str: string) => Number(str)),
  startWith(0)
)

const $plus = $node(
  style({
    justifyContent: 'center', alignItems: 'center',
    width: '36px', color: designSheet.theme.system
  }),
  designSheet.displayFlex
)

export default component((
  [sampleX, x]: Behavior<string, number>,
  [sampleY, y]: Behavior<string, number>
) =>
  [
    $column(designSheet.spacingSmall)(

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
          decrementColor: designSheet.themeAttention.negative,
          incrementColor: designSheet.themeAttention.positive,
          slots: 30
        })
      )

    )
  ]
)


