
import { chain, constant, map, merge, mergeArray, now, snapshot, until } from '@most/core'
import { $text, Behavior, behavior, component, style } from '@aelea/core'
import { $column, $row, $seperator, $TrashBtn } from '../common/common'
import * as designSheet from '../common/stylesheet'
import $Counter, { sumAdd } from './$Counter'
import $Button from './form/$Button'

const $AddBtn = $Button({
  $content: $text('Add One')
})

export default component((
  [sampleAddedCounter, addedCounter]: Behavior<PointerEvent, PointerEvent>,
  [sampleDisposeCounter, disposeCounter]: Behavior<PointerEvent, PointerEvent>,
  [sampleCountersIncrement, counterIncrement]: Behavior<1, 1>,
  [sampleCountersDecrement, counterDecrement]: Behavior<-1, -1>,
  [sampleDisposedCounterCount, disposedCounterCount]: Behavior<number, number>,
) => {

  const INITAL_COUNT = 0
  const sumWithInitial = sumAdd(INITAL_COUNT)

  const counting = mergeArray([disposedCounterCount, counterIncrement, counterDecrement])
  const totalCount = sumWithInitial(counting)

  const counters = merge(addedCounter, now(null))

  return [

    $column(designSheet.spacing)(
      $row(style({ placeContent: 'space-between', alignItems: 'center' }), designSheet.spacing)(
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
      chain(_ => {
        const [sampleRemove, remove] = behavior<PointerEvent, PointerEvent>()

        return until(remove)(
          $column(designSheet.spacing)(
            $seperator,
            $row(style({ alignItems: 'center' }), designSheet.spacingBig)(
              $TrashBtn({
                click: sampleDisposeCounter(
                  sampleRemove()
                )
              }),
              $Counter({ initial: INITAL_COUNT })({
                increment: sampleCountersIncrement(),
                decrement: sampleCountersDecrement(),
                count: sampleDisposedCounterCount(
                  source => snapshot(n => -n, source, remove)
                )
              })
            )
          )
        )
      }, counters)
    )

  ]
})

