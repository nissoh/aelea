import { constant, type IStream, map, merge, sampleMap, skipRepeats, skipRepeatsWith, switchMap } from 'aelea/stream'
import type { IBehavior } from 'aelea/stream-extended'
import { $node, $text, component, style } from 'aelea/ui'
import { $Button, $column, $row, $seperator, spacing } from 'aelea/ui-components'
import { pallete } from 'aelea/ui-components-theme'
import { $TrashBtn } from '../../../elements/$common'
import { $Counter } from './$Counter'

interface CountCounters {
  counterList: IStream<number[]>
}

export const $CountCounters = ({ counterList }: CountCounters) =>
  component(
    (
      [addCounter, addCounterTether]: IBehavior<PointerEvent, PointerEvent>,
      [removeCounter, removeCounterTether]: IBehavior<PointerEvent, number>,
      [updateCounter, updateCounterTether]: IBehavior<number, { index: number; value: number }>
    ) => {
      // Derived state
      const totalSum = map(list => list.reduce((sum, val) => sum + val, 0), counterList)
      const counterCount = map(list => list.length, counterList)

      const listLens = skipRepeatsWith((a, b) => a.length === b.length, counterList)
      const counterLens = (index: number) => skipRepeats(map(list => list[index], counterList))

      return [
        $column(spacing.default)(
          // Header with stats and add button
          $row(style({ placeContent: 'space-between', alignItems: 'center' }), spacing.default)(
            $row(spacing.small)(
              $node(style({ color: pallete.foreground }))($text('Counters: ')),
              $text(map(String, counterCount))
            ),
            $row(spacing.small)(
              $node(style({ color: pallete.foreground }))($text('Sum: ')),
              $text(map(String, totalSum))
            ),
            $Button({
              $content: $text('Add Counter')
            })({
              click: addCounterTether()
            })
          ),

          // Counter list - only re-render when length changes
          switchMap(list => {
            return $column(spacing.default)(
              ...list.flatMap((_, index) => {
                const value = counterLens(index)

                return [
                  $seperator,
                  $row(style({ alignItems: 'center' }), spacing.big)(
                    $TrashBtn({
                      click: removeCounterTether(constant(index))
                    }),
                    $Counter(value)({
                      valueChange: updateCounterTether(map(newValue => ({ index, value: newValue })))
                    })
                  )
                ]
              })
            )
          }, listLens)
        ),

        // Output: merged list updates
        {
          changeCounterList: merge(
            // Add new counter with initial value 0
            sampleMap(list => [...list, 0], counterList, addCounter),

            // Remove counter at index
            sampleMap((list, index) => list.filter((_, i) => i !== index), counterList, removeCounter),

            // Update counter value at index
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
