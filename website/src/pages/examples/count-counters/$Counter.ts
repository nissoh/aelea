import { constant } from '@most/core'
import type { IBehavior } from 'aelea/core'
import { $text, component, style } from 'aelea/core'
import { $Button, $column, $NumberTicker, $row, spacing } from 'aelea/ui-components'
import { pallete } from 'aelea/ui-components-theme'

interface Counter {
  value: IStream<number>
}

export default ({ value }: Counter) =>
  component(
    (
      [increment, incrementTether]: IBehavior<PointerEvent, 1>,
      [decrement, decrementTether]: IBehavior<PointerEvent, -1>
    ) => {
      return [
        $row(style({ alignItems: 'center', placeContent: 'space-between' }), spacing.default)(
          $column(style({ borderRadius: '5px', alignItems: 'center' }), spacing.default)(
            $Button({ $content: $text('+') })({
              click: incrementTether(constant(1))
            }),
            $Button({ $content: $text('-') })({
              click: decrementTether(constant(-1))
            })
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
    }
  )
