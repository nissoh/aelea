
import { chain, until, filter, map, constant } from '@most/core'
import { newDefaultScheduler } from '@most/scheduler'
import { component, $text, Behavior, style, runAt } from 'fufu'

import { $column, $examplesRoot, $seperator } from '../common/common'
import { $Button } from '../common/form/button'
import * as designSheet from '../common/style/stylesheet'

import $Counter from './counter'


let counterId = 0


const $AddBtn = $Button({
  $content: $text('Add One')
})

const $CounterCreator = component((
  [sampleAdd, add]: Behavior<any, typeof counterId>,
  [sampleRemove, remove]: Behavior<any, typeof counterId>,
) => [
    $column(
      designSheet.spacing,
      style({ width: '250px', margin: '0 auto' })
    )(
      $AddBtn({
        click: sampleAdd(
          map(() => counterId++)
        )
      }),
      chain(cid => {
        const disposeCounter = until(
          filter(id => cid === id, remove)
        )

        return disposeCounter(
          $column(designSheet.spacing)(
            $seperator,
            $Counter({
              remove: sampleRemove(constant(cid))
            })
          )
        )
      }, add)
    )
  ])




runAt(
  $examplesRoot(
    $CounterCreator({})
  ),
  newDefaultScheduler()
)

