
import { map, combine, startWith } from '@most/core'
import { component, nullSink, $node, $text, style, O, ProxyStream, renderAt } from 'fufu'
import { newDefaultScheduler } from '@most/scheduler'
import { $row, $column } from '../common/flex'
import { $field, InputType } from '../common/form'
import * as commonSSheet from '../style/stylesheet'


const add = (x: number, y: number) => x + y


const extractValue = O(
  map((evt: Event) => evt.target instanceof HTMLInputElement
  ? Number(evt.target.value)
  : null),
  startWith(0)
)

const $seperator = $node(O(
  style({ width: '26px', padding: '0 10px' }),
  commonSSheet.panningContainer
))

const $add = component((a: ProxyStream<Event>, b: ProxyStream<Event>) =>
  $row(
    $field({ label: 'A', type: InputType.NUMBER, value: 0 }, a),
    $seperator(
      $text('+')
    ),
    $field({ label: 'B', type: InputType.NUMBER, value: 0 }, b),
    $row(
      $text(map(String, combine(add, extractValue(a), extractValue(b))))
    )
  )
)



renderAt(document.body, commonSSheet.panningUI($column(
  $add,
  $node(style({ height: '50px' }))(),
  $add,
)))

  .run(nullSink, newDefaultScheduler())




