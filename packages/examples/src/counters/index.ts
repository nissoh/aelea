
import { component, $text, style, renderAt, event, $element, splitBehavior, ProxyStream, O } from 'fufu'
import { chain, until, filter, map } from '@most/core'
import { newDefaultScheduler } from '@most/scheduler'
import { $column, $row } from '../common/flex'

import * as stylesheet from '../style/stylesheet'
import counter from './counter'


const $btn = $element('button')(O(
  stylesheet.btn,
  style({
    textAlign: 'center', color: '#ffffff',
    background: '#e65656', borderRadius: '4px', display: 'block'
  })
))


let counterId = 0

const addCounter = O(
  event('click'),
  map(() => counterId++)
)

const $counterCreator = component((add: ProxyStream<typeof counterId>, remove: ProxyStream<typeof counterId>) =>

  $column(
    $row(
      $btn(splitBehavior(addCounter, add))(
        $text('Add One')
      )
    ),
    chain(cid => {
      const disposeCounter = filter(id => cid === id, remove)

      return until(disposeCounter, counter(remove, cid))
    }, add)
  )

)



renderAt(document.body, stylesheet.panningUI($counterCreator)).run({
  event() { },
  error(t, e) {
    throw e
  },
  end() { }
}, newDefaultScheduler())