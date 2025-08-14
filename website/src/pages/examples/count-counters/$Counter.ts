import { type IStream, merge, sampleMap } from 'aelea/stream'
import type { IBehavior } from 'aelea/stream-extended'
import { $text, component, style } from 'aelea/ui'
import { $Button, $column, $NumberTicker, $row, spacing } from 'aelea/ui-components'

export const $Counter = (value: IStream<number>) =>
  component(
    (
      [increment, incrementTether]: IBehavior<PointerEvent, PointerEvent>,
      [decrement, decrementTether]: IBehavior<PointerEvent, PointerEvent>
    ) => {
      return [
        $row(style({ alignItems: 'center', placeContent: 'space-between' }), spacing.default)(
          $column(style({ borderRadius: '5px', alignItems: 'center' }), spacing.default)(
            $Button({ $content: $text('+') })({
              click: incrementTether()
            }),
            $Button({ $content: $text('-') })({
              click: decrementTether()
            })
          ),

          $NumberTicker({
            value: value,
            textStyle: {
              fontSize: '30px'
            }
          })
        ),

        {
          valueChange: merge(
            sampleMap(v => v + 1, value, increment),
            sampleMap(v => v - 1, value, decrement)
          )
        }
      ]
    }
  )
