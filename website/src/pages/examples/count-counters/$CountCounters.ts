
import { $text, Behavior, behavior, component, state, style } from '@aelea/core'
import { $Button, $column, $row, $seperator, $TrashBtn, layoutSheet } from '@aelea/ui-components'
import { chain, constant, map, merge, mergeArray, now, scan, snapshot, until } from '@most/core'
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

  const counters = merge(addedCounter, now(null))

  return [

    $column(layoutSheet.spacing)(
      $row(style({ placeContent: 'space-between', alignItems: 'center' }), layoutSheet.spacing)(
        $text(
          map(n => `Counters: ${n}`, sumWithInitial(merge(constant(1, counters), constant(-1, disposeCounter))))
        ),
        $text(
          map(n => `Sum: ${n}`, totalCount)
        ),
        $AddBtn({
          click: sampleAddedCounter()
        }),
      ),
      chain(() => {

        const [sampleRemove, remove] = behavior<PointerEvent, PointerEvent>()
        const [sampleValue, value$] = state(0)


        return until(remove)(
          $column(layoutSheet.spacing)(
            $seperator,
            $row(style({ alignItems: 'center' }), layoutSheet.spacingBig)(
              $TrashBtn({
                click: sampleDisposeCounter(
                  sampleRemove(),
                  sampleDisposedCounterCount(
                    snapshot((value) => -value, value$)
                  )
                )
              }),
              $Counter({ value$ })({
                increment: sampleValue(
                  sampleCountersIncrement(),
                  snapshot((value, increment) => value + increment, value$),
                ),
                decrement: sampleValue(
                  sampleCountersDecrement(),
                  snapshot((value, increment) => value + increment, value$),
                )
              })
            )
          )
        )
      }, counters)
    )

  ]
})

