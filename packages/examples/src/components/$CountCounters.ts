
import { chain, constant, map, merge, mergeArray, snapshot, until } from '@most/core'
import { $text, Behavior, behavior, component, style } from 'fufu'
import { $column, $row, $seperator } from '../common/common'
import * as designSheet from '../common/stylesheet'
import $Counter, { sumFromZeroOp } from './$Counter'
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

  const count = sumFromZeroOp(mergeArray([disposedCounterCount, counterIncrement, counterDecrement]))

  return [

    $column(designSheet.spacing)(
      $row(style({ placeContent: 'space-between', alignItems: 'center' }), designSheet.spacing)(
        $text(
          map(n => `Counters: ${n}`, sumFromZeroOp(merge(constant(1, addedCounter), constant(-1, disposeCounter))))
        ),
        $text(
          map(n => `Sum: ${n}`, count)
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
            $Counter({
              dispose: sampleDisposeCounter(
                sampleRemove()
              ),
              increment: sampleCountersIncrement(),
              decrement: sampleCountersDecrement(),
              count: sampleDisposedCounterCount(
                source => snapshot(n => -n, source, remove)
              )
            })
          )
        )
      }, addedCounter)
    )

  ]
})

