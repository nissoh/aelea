import { constant, joinMap, map, merge, now, reduce, sampleMap, until } from 'aelea/stream'
import { behavior, type IBehavior, state } from 'aelea/stream-extended'
import { $node, $text, component, style } from 'aelea/ui'
import { $Button, $column, $row, $seperator, spacing } from 'aelea/ui-components'
import { pallete } from 'aelea/ui-components-theme'
import { $TrashBtn } from '../../../elements/$common'
import $Counter from './$Counter'

export default component(
  (
    [addedCounter, addedCounterTether]: IBehavior<PointerEvent, PointerEvent>,
    [disposeCounter, disposeCounterTether]: IBehavior<PointerEvent, PointerEvent>,
    [counterIncrement, countersIncrementTether]: IBehavior<1, 1>,
    [counterDecrement, countersDecrementTether]: IBehavior<-1, -1>,
    [disposedCounterCount, disposedCounterCountTether]: IBehavior<any, number>
  ) => {
    const INITAL_COUNT = 0
    const sumWithInitial = reduce((current, x: number) => current + x, INITAL_COUNT)

    const counting = merge(disposedCounterCount, counterIncrement, counterDecrement)
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
          $Button({
            $content: $text('Add One')
          })({
            click: addedCounterTether()
          })
        ),
        joinMap(() => {
          const [remove, removeTether] = behavior<PointerEvent, PointerEvent>()
          const [valueChange, valueChangeTether] = behavior<number, number>()

          const value = state(valueChange, 0)

          return until(
            remove,
            $column(spacing.default)(
              $seperator,
              $row(style({ alignItems: 'center' }), spacing.big)(
                $TrashBtn({
                  click: removeTether(disposeCounterTether(), disposedCounterCountTether(sampleMap(val => -val, value)))
                }),
                $Counter({ value })({
                  increment: countersIncrementTether(
                    valueChangeTether(sampleMap((val, increment) => val + increment, value))
                  ),
                  decrement: countersDecrementTether(
                    valueChangeTether(sampleMap((val, increment) => val + increment, value))
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
