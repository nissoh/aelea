
import { $text, component, style } from '@aelea/dom'
import { Behavior, behavior, O } from '@aelea/core'
import { $Button, $column, $row, $seperator, layoutSheet, state } from '@aelea/ui-components'
import { pallete } from '@aelea/ui-components-theme'
import { chain, constant, map, merge, mergeArray, multicast, now, scan, snapshot, until } from '@most/core'
import { $TrashBtn } from '../../../elements/$common'
import $Counter from './$Counter'

const $AddBtn = $Button({
  $content: $text('Add One')
})
export const sumAdd = scan((current: number, x: number) => current + x)

export default component((
  [addedCounter, addedCounterTether]: Behavior<PointerEvent, PointerEvent>,
  [disposeCounter, disposeCounterTether]: Behavior<PointerEvent, PointerEvent>,
  [counterIncrement, countersIncrementTether]: Behavior<1, 1>,
  [counterDecrement, countersDecrementTether]: Behavior<-1, -1>,
  [disposedCounterCount, disposedCounterCountTether]: Behavior<any, number>,
) => {

  const INITAL_COUNT = 0
  const sumWithInitial = sumAdd(INITAL_COUNT)

  const counting = mergeArray([disposedCounterCount, counterIncrement, counterDecrement])
  const totalCount = sumWithInitial(counting)

  const addCounter = merge(addedCounter, now(null))

  return [

    $column(layoutSheet.spacing)(
      $row(style({ placeContent: 'space-between', alignItems: 'center' }), layoutSheet.spacing)(
        $row(layoutSheet.spacingSmall)(
          $text(style({ color: pallete.foreground }))('Counters: '),
          $text(
            map(String, sumWithInitial(merge(constant(1, addCounter), constant(-1, disposeCounter))))
          ),
        ),
        $row(layoutSheet.spacingSmall)(
          $text(style({ color: pallete.foreground }))('Sum: '),
          $text(map(String, totalCount))
        ),
        $AddBtn({
          click: addedCounterTether()
        }),
      ),
      chain(() => {

        const [remove, removeTether] = behavior<PointerEvent, PointerEvent>()
        const [valueChange, valueChangeTether] = behavior<number, number>()

        const value = state.replayLatest(multicast(valueChange), 0)


        return until(remove)(
          $column(layoutSheet.spacing)(
            $seperator,
            $row(style({ alignItems: 'center' }), layoutSheet.spacingBig)(
              $TrashBtn({
                click: O(
                  removeTether(),
                  disposeCounterTether(),
                  disposedCounterCountTether(
                    snapshot(val => -val, value)
                  ),
                )
              }),
              $Counter({ value })({
                increment: O(
                  countersIncrementTether(),               
                  valueChangeTether(
                    snapshot((val, increment) => val + increment, value)
                  ),
                ),
                decrement: O(
                  countersDecrementTether(),
                  valueChangeTether(
                    snapshot((val, increment) => val + increment, value)
                  ),
                )
              })
            )
          )
        )
      }, addCounter)
    )

  ]
})

