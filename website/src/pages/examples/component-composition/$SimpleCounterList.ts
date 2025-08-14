import { constant, type IStream, map, merge, sampleMap, switchMap } from 'aelea/stream'
import type { IBehavior } from 'aelea/stream-extended'
import { $node, $text, component, style } from 'aelea/ui'
import { $SimpleCounter } from './$SimpleCounter'

interface SimpleCounterListProps {
  counterList: IStream<number[]>
}

export const $SimpleCounterList = ({ counterList }: SimpleCounterListProps) =>
  component(
    (
      [addCounter, addCounterTether]: IBehavior<PointerEvent, PointerEvent>,
      [removeCounter, removeCounterTether]: IBehavior<number, number>,
      [updateCounter, updateCounterTether]: IBehavior<number, { index: number; value: number }>
    ) => {
      return [
        // Header
        $text('Total: '),
        $text(map(list => String(list.reduce((sum, v) => sum + v, 0)), counterList)),
        $text(' | Count: '),
        $text(map(list => String(list.length), counterList)),
        $text(' '),
        $node(style({ cursor: 'pointer' }))($text('[Add Counter]'))({
          click: addCounterTether()
        }),

        // Counter list
        switchMap(
          list =>
            $node()(
              ...list.flatMap((_, index) => [
                $text(' | '),
                $SimpleCounter({
                  value: map(list => list[index] ?? 0, counterList)
                })({
                  valueChange: updateCounterTether(map(v => ({ index, value: v })))
                }),
                $text(' '),
                $node(style({ cursor: 'pointer' }))($text('[X]'))({
                  click: removeCounterTether(constant(index))
                })
              ])
            ),
          counterList
        ),

        // Output: list updates
        {
          changeCounterList: merge(
            // Add counter
            sampleMap(list => [...list, 0], counterList, addCounter),
            // Remove counter
            sampleMap((list, index) => list.filter((_, i) => i !== index), counterList, removeCounter),
            // Update counter
            sampleMap(
              (list, { index, value }) => {
                const newList = [...list]
                newList[index] = value
                return newList
              },
              counterList,
              updateCounter
            )
          )
        }
      ]
    }
  )
