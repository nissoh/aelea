
import { chain, until, map, constant, merge, snapshot, mergeArray } from '@most/core'
import { id } from '@most/prelude'
import { component, $text, Behavior, behavior, style, $node } from 'fufu'

import { $column, $row, $seperator } from '../common/common'
import { $Button } from '../common/form/button'
import * as designSheet from '../common/style/stylesheet'

import $Counter, { sumFromZeroOp } from '../counter/$Counter'


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

