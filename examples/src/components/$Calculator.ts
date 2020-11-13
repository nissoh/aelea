
import { combine, map, now, startWith } from '@most/core'
import { $node, $text, Behavior, component, O, style } from '@aelea/core'
import { $column, $row } from '../common/common'
import * as designSheet from '../common/stylesheet'
import $Input from './form/$Input'


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
    $column(

      $row(
        $plus(
          $text('+')
        ),
        $column(
          $Input({ setValue: now('0') })({
            value: sampleX(extractValue)
          }),
          $Input({ setValue: now('0') })({
            value: sampleY(extractValue)
          })
        )
      ),

      $row(
        $node(style({ width: '36px' }))(),
        $text(style({ lineHeight: '46px', fontSize: '28px' }))(map(String, combine(add, x, y)))
      )

    )
  ]
)


