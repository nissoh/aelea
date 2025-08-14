import { type IStream, map, merge, sampleMap } from 'aelea/stream'
import type { IBehavior } from 'aelea/stream-extended'
import { $node, $text, component, style } from 'aelea/ui'

interface SimpleCounterProps {
  value: IStream<number>
}

export const $SimpleCounter = ({ value }: SimpleCounterProps) =>
  component(
    (
      [increment, incrementTether]: IBehavior<PointerEvent, PointerEvent>,
      [decrement, decrementTether]: IBehavior<PointerEvent, PointerEvent>
    ) => {
      return [
        // UI
        $text('Count: '),
        $text(map(String, value)),
        $text(' '),
        $node(style({ cursor: 'pointer' }))($text('[+]'))({
          click: incrementTether()
        }),
        $text(' '),
        $node(style({ cursor: 'pointer' }))($text('[-]'))({
          click: decrementTether()
        }),

        // Output: value changes
        {
          valueChange: merge(
            sampleMap(v => v + 1, value, increment),
            sampleMap(v => v - 1, value, decrement)
          )
        }
      ]
    }
  )
