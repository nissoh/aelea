import { constant } from '@most/core'
import type { Stream } from '@most/types'
import type { Behavior } from 'aelea/core'
import { $text, component, style } from 'aelea/dom'
import {
  $Button,
  $column,
  $NumberTicker,
  $row,
  spacing,
} from 'aelea/ui-components'
import { pallete } from 'aelea/ui-components-theme'

interface Counter {
  value: Stream<number>
}

export default ({ value }: Counter) =>
  component(
    (
      [increment, incrementTether]: Behavior<PointerEvent, 1>,
      [decrement, decrementTether]: Behavior<PointerEvent, -1>,
    ) => {
      return [
        $row(
          style({ alignItems: 'center', placeContent: 'space-between' }),
          spacing.default,
        )(
          $column(
            style({ borderRadius: '5px', alignItems: 'center' }),
            spacing.default,
          )(
            $Button({ $content: $text('+') })({
              click: incrementTether(constant(1)),
            }),
            $Button({ $content: $text('-') })({
              click: decrementTether(constant(-1)),
            }),
          ),

          $NumberTicker({
            value$: value,
            textStyle: {
              fontSize: '30px',
            },
            decrementColor: pallete.negative,
            incrementColor: pallete.positive,
          }),
        ),

        { increment, decrement },
      ]
    },
  )
