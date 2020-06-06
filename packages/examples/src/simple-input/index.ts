
import { component, style, $node, browserBootstrap, $text, ProxyStream } from 'fufu'
import * as stylesheet from '../style/stylesheet'
import { $column } from '../common/flex'
import { $field, InputType } from '../common/form'
import { map } from '@most/core'


const extractValue = map((ev: Event) =>
  ev.srcElement instanceof HTMLInputElement ? ev.srcElement.value : ''
)

const $simpleInput = component((input: ProxyStream<Event>) =>

  $column(stylesheet.flex)(
    $node(style({ backgroundColor: '#ffc0cb4f', padding: '10px', margin: '10px' }))(
      $field({
        label: 'Hello',
        type: InputType.TEXT,
        value: 0
      }, input)
    ),
    $text(extractValue(input)),
  )

)


browserBootstrap($node(stylesheet.panningUI)(
  $simpleInput
))



