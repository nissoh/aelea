import { constant, map, merge, scan } from '@most/core'
import { style, $text, component, O, Behavior } from 'fufu'
import * as designSheet from '../common/style/stylesheet'
import { $column, $row, $TrashBtn } from '../common/common'
import { $Button } from '../common/form/button'



const sum = O(
  scan((current: number, x: number) => current + x, 0),
  map(String)
)


const $counterContainer = $column(
  designSheet.spacing,
  style({
    borderRadius: '5px',
    alignItems: 'center'
  })
)


export default component((
  [sampleIncrement, increment]: Behavior<PointerEvent, 1>,
  [sampleDecrement, decrement]: Behavior<PointerEvent, -1>,
  [sampleRemove, remove]: Behavior<PointerEvent, PointerEvent>,
) => [

    $row(style({ alignItems: 'center', justifyContent: 'center' }), designSheet.spacing)(
      $TrashBtn({
        click: sampleRemove()
      }),
      $counterContainer(
        $Button({ $content: $text('+') })({
          click: sampleIncrement(constant(1))
        }),
        $Button({ $content: $text('-') })({
          click: sampleDecrement(constant(-1))
        }),
      ),
      $text(style({ fontSize: '64px' }))(
        sum(merge(increment, decrement))
      ),

    ),

    {
      remove
    }

  ])
