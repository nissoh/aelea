import { chain, constant, map, merge, mergeArray, multicast, now, scan, snapshot, until } from '@most/core'
import { $node, $text, behavior, component, type IBehavior, replayLatest, style } from 'aelea/core'
import { $Button, $column, $row, $seperator, spacing } from 'aelea/ui-components'
import { pallete } from 'aelea/ui-components-theme'
import { $TrashBtn } from '../../../elements/$common'
import $Counter from './$Counter'

const $AddBtn = $Button({
  $content: $text('Add One')
})
export const sumAdd = scan((current: number, x: number) => current + x)

export default component(
  (
    [addedCounter, addedCounterTether]: IBehavior<PointerEvent, PointerEvent>,
    [disposeCounter, disposeCounterTether]: IBehavior<PointerEvent, PointerEvent>,
    [counterIncrement, countersIncrementTether]: IBehavior<1, 1>,
    [counterDecrement, countersDecrementTether]: IBehavior<-1, -1>,
    [disposedCounterCount, disposedCounterCountTether]: IBehavior<any, number>
  ) => {
    const INITAL_COUNT = 0
    const sumWithInitial = sumAdd(INITAL_COUNT)

    const counting = mergeArray([disposedCounterCount, counterIncrement, counterDecrement])
    const totalCount = sumWithInitial(counting)

    const addCounter = merge(addedCounter, now(null))

    return [
      $column(spacing.default)(
        $row(style({ placeContent: 'space-between', alignItems: 'center' }), spacing.default)(
          $row(spacing.small)(
            $node(style({ color: pallete.foreground }))($text('Counters: ')),
            $text(map(String, sumWithInitial(merge(constant(1, addCounter), constant(-1, disposeCounter)))))
          ),
          $row(spacing.small)(
            $node(style({ color: pallete.foreground }))($text('Sum: ')),
            $text(map(String, totalCount))
          ),
          $AddBtn({
            click: addedCounterTether()
          })
        ),
        chain(() => {
          const [remove, removeTether] = behavior<PointerEvent, PointerEvent>()
          const [valueChange, valueChangeTether] = behavior<number, number>()

          const value = replayLatest(multicast(valueChange), 0)

          return until(remove)(
            $column(spacing.default)(
              $seperator,
              $row(style({ alignItems: 'center' }), spacing.big)(
                $TrashBtn({
                  click: o(
                    removeTether(),
                    disposeCounterTether(),
                    disposedCounterCountTether(snapshot((val) => -val, value))
                  )
                }),
                $Counter({ value })({
                  increment: o(
                    countersIncrementTether(),
                    valueChangeTether(snapshot((val, increment) => val + increment, value))
                  ),
                  decrement: o(
                    countersDecrementTether(),
                    valueChangeTether(snapshot((val, increment) => val + increment, value))
                  )
                })
              )
            )
          )
        }, addCounter)
      )
    ]
  }
)
