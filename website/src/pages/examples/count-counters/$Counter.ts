import { Behavior } from '@aelea/core'
import { $text, component, style } from '@aelea/dom'
import { $Button, $column, $NumberTicker, $row, layoutSheet } from '@aelea/ui-components'
import { pallete } from '@aelea/ui-components-theme'
import { constant } from '@most/core'
import { Stream } from '@most/types'


interface Counter {
  value: Stream<number>
}

export default ({ value }: Counter) => component((
  [increment, incrementTether]: Behavior<PointerEvent, 1>,
  [decrement, decrementTether]: Behavior<PointerEvent, -1>
) => {


  return [

    $row(style({ alignItems: 'center', placeContent: 'space-between' }), layoutSheet.spacing)(
      $column(style({ borderRadius: '5px', alignItems: 'center' }), layoutSheet.spacing)(
        $Button({ $content: $text('+') })({
          click: incrementTether(
            constant(1)
          )
        }),
        $Button({ $content: $text('-') })({
          click: decrementTether(
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
