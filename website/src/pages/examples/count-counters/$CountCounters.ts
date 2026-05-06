import { constant, type IStream, map, merge, sampleMap, skipRepeats, skipRepeatsWith, switchMap } from 'aelea/stream'
import type { IBehavior } from 'aelea/stream-extended'
import { $node, $text, component, style } from 'aelea/ui'
import { $Button, $column, $row, $separator, spacing } from 'aelea/ui-components'
import { palette } from 'aelea/ui-components-theme'
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
      const totalSum = map(list => list.reduce((sum, val) => sum + val, 0), counterList)
      const counterCount = map(list => list.length, counterList)

      const listLens = skipRepeatsWith((a, b) => a.length === b.length, counterList)
      const counterLens = (index: number) => skipRepeats(map(list => list[index], counterList))

      return [
        $column(spacing.default)(
          $row(style({ placeContent: 'space-between', alignItems: 'center' }), spacing.default)(
            $row(spacing.small)(
              $node(style({ color: palette.foreground }))($text('Counters: ')),
              $text(map(String, counterCount))
            ),
            $row(spacing.small)(
              $node(style({ color: palette.foreground }))($text('Sum: ')),
              $text(map(String, totalSum))
            ),
            $Button({
              $content: $text('Add Counter')
            })({
              click: addCounterTether()
            })
          ),

          switchMap(list => {
            return $column(spacing.default)(
              ...list.flatMap((_, index) => {
                const value = counterLens(index)

                return [
                  $separator,
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

        {
          changeCounterList: merge(
            sampleMap(list => [...list, 0], counterList, addCounter),
            sampleMap((list, index) => list.filter((_, i) => i !== index), counterList, removeCounter),
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
