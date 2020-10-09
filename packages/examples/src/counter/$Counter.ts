import { constant, map, merge, scan } from '@most/core'
import { style, $text, component, O, Behavior } from 'fufu'
import * as designSheet from '../common/style/stylesheet'
import { $column, $row, $TrashBtn } from '../common/common'
import { $Button } from '../common/form/button'


export const sumFromZeroOp = scan((current: number, x: number) => current + x, 0)

const $counterContainerStyle = O(
  designSheet.spacing,
  style({
    borderRadius: '5px',
    alignItems: 'center'
  })
)


export default component((
  [sampleIncrement, increment]: Behavior<PointerEvent, 1>,
  [sampleDecrement, decrement]: Behavior<PointerEvent, -1>,
  [sampleDispose, dispose]: Behavior<PointerEvent, PointerEvent>,
) => {
  const count = sumFromZeroOp(merge(increment, decrement))

  return [

    $row(style({ alignItems: 'center', placeContent: 'space-between' }), designSheet.spacing)(
      $column($counterContainerStyle)(
        $Button({ $content: $text('+') })({
          click: sampleIncrement(constant(1))
        }),
        $Button({ $content: $text('-') })({
          click: sampleDecrement(constant(-1))
        }),
      ),

      $text(style({ fontSize: '64px', }))(
        map(String, count)
      ),

      $TrashBtn({
        click: sampleDispose()
      }),
    ),

    {
      dispose,
      increment,
      decrement,
      count
    }
  ]
})
