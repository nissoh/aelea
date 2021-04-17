import { $text, Behavior, component, style } from '@aelea/core'
import { $Button, $column, $NumberTicker, $row, layoutSheet } from '@aelea/ui-components'
import { pallete } from '@aelea/ui-components-theme'
import { constant } from '@most/core'
import { Stream } from '@most/types'


interface Counter {
  value: Stream<number>
}

export default ({ value }: Counter) => component((
  [sampleIncrement, increment]: Behavior<PointerEvent, 1>,
  [sampleDecrement, decrement]: Behavior<PointerEvent, -1>
) => {


  return [

    $row(style({ alignItems: 'center', placeContent: 'space-between' }), layoutSheet.spacing)(
      $column(style({ borderRadius: '5px', alignItems: 'center' }), layoutSheet.spacing)(
        $Button({ $content: $text('+') })({
          click: sampleIncrement(
            constant(1)
          )
        }),
        $Button({ $content: $text('-') })({
          click: sampleDecrement(
            constant(-1)
          )
        }),
      ),

      $NumberTicker({
        value$: value,
        textStyle: {
          fontSize: '30px'
        },
        decrementColor: pallete.negative,
        incrementColor: pallete.positive
      })
    ),

    { increment, decrement }

  ]
})
