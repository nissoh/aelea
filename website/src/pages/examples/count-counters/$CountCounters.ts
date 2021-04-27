
import { $text, Behavior, behavior, component, O, style } from '@aelea/core'
import { $Button, $column, $row, $seperator, layoutSheet } from '@aelea/ui-components'
import { pallete } from '@aelea/ui-components-theme'
import { chain, constant, map, merge, mergeArray, now, scan, snapshot, startWith, until } from '@most/core'
import { $TrashBtn } from '../../../elements/$common'
import $Counter from './$Counter'

const $AddBtn = $Button({
  $content: $text('Add One')
})
export const sumAdd = scan((current: number, x: number) => current + x)

export default component((
  [sampleAddedCounter, addedCounter]: Behavior<PointerEvent, PointerEvent>,
  [sampleDisposeCounter, disposeCounter]: Behavior<PointerEvent, PointerEvent>,
  [sampleCountersIncrement, counterIncrement]: Behavior<1, 1>,
  [sampleCountersDecrement, counterDecrement]: Behavior<-1, -1>,
  [sampleDisposedCounterCount, disposedCounterCount]: Behavior<any, number>,
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
          click: sampleAddedCounter()
        }),
      ),
      chain(() => {

        const [sampleRemove, remove] = behavior<PointerEvent, PointerEvent>()
        const [sampleValueChange, valueChange] = behavior<number, number>()

        const value = startWith(0, valueChange)


        return until(remove)(
          $column(layoutSheet.spacing)(
            $seperator,
            $row(style({ alignItems: 'center' }), layoutSheet.spacingBig)(
              $TrashBtn({
                click: O(
                  sampleRemove(),
                  sampleDisposeCounter(),
                  sampleDisposedCounterCount(
                    snapshot(val => -val, value)
                  ),
                )
              }),
              $Counter({ value })({
                increment: O(
                  sampleCountersIncrement(),               
                  sampleValueChange(
                    snapshot((val, increment) => val + increment, value)
                  ),
                ),
                decrement: O(
                  sampleCountersDecrement(),
                  sampleValueChange(
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

