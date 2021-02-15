import { $text, Behavior, component, style } from '@aelea/core'
import { constant, merge, scan } from '@most/core'
import { $column, $row } from '../common/common'
import * as designSheet from '../common/stylesheet'
import { themeAttention } from '../common/stylesheet'
import $NumberTicker from './$NumberTicker'
import $Button from './form/$Button'

export const sumAdd = scan((current: number, x: number) => current + x)


interface Counter {
  initial: number
}

export default ({ initial }: Counter) => component((
  [sampleIncrement, increment]: Behavior<PointerEvent, 1>,
  [sampleDecrement, decrement]: Behavior<PointerEvent, -1>
) => {

  const count = sumAdd(initial, merge(increment, decrement))

  return [

    $row(style({ alignItems: 'center', placeContent: 'space-between' }), designSheet.spacing)(
      $column(style({ borderRadius: '5px', alignItems: 'center' }), designSheet.spacing)(
        $Button({ $content: $text('+') })({
          click: sampleIncrement(constant(1))
        }),
        $Button({ $content: $text('-') })({
          click: sampleDecrement(constant(-1))
        }),
      ),

      $NumberTicker({
        initial,
        change: count,
        textStyle: {
          fontSize: '30px'
        },
        decrementColor: themeAttention.negative,
        incrementColor: themeAttention.positive
      })
    ),

    { increment, decrement, count }

  ]
})
