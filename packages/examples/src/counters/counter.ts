import { constant, map, merge, scan } from '@most/core'
import { style, $text, component, event, O, $custom, splitBehavior, ProxyStream } from 'fufu'
import * as stylesheet from '../style/stylesheet'
import { $row } from '../common/flex'



const sum = O(
  scan((current: number, x: number) => current + x, 0),
  map(String)
)

const plus1Click = O(
  event('click'),
  constant(-1)
)
const minus1Click = O(
  event('click'),
  constant(1)
)


const $counter = $row(
  style({
    backgroundColor: '#ffc0cb4f',
    padding: '10px',
    margin: '10px',
    borderRadius: '5px'
  })
)

const $btn = $custom('button')(
  stylesheet.btn,
  style({ padding: '2px 6px', lineHeight: 0 }),
)

const $xBtn = $custom('button')(
  stylesheet.btn,
  style({ padding: '6px' }),
)

export default (remove: ProxyStream<number>, counterId: number) => component((increment: ProxyStream<1>, decrement: ProxyStream<-1>) =>

  $row(stylesheet.panningContainer)(
    $counter(
      $row(
        $btn(splitBehavior(plus1Click, decrement))(
          $text('-')
        ),
        $text(
          sum(merge(increment, decrement))
        ),
        $btn(splitBehavior(minus1Click, decrement))(
          $text('+')
        ),
      )
    ),
    $xBtn(splitBehavior(O(event('click'), constant(counterId)), remove))(
      $text('x')
    )
  )

)
