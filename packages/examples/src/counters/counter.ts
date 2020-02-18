import {constant, map, merge, scan, switchLatest} from '@most/core'
import {style, text, node, component, domEvent, pipe, Op} from 'fufu'
import * as stylesheet from '../style/stylesheet'
import {row} from '../common/flex'



const countBtn = (str: string) => style({margin: '6px'}, stylesheet.btn(node(
  text(str)
)))


const countUp = pipe(domEvent('click'), constant(1))
const countDown = pipe(domEvent('click'), constant(-1))
const counting = pipe(
  scan((acc, x: number) => acc + x, 0),
  map(String)
)

const counterStyle = style({backgroundColor: '#ffc0cb4f', padding: '10px', margin: '10px'})

export default component(({up, down}) => {
  const countStream = counting(merge(up, down))
  const counterContainer = pipe(node, counterStyle)

  return counterContainer(
    node([
      row([
        down.sample(countBtn('+'), countUp),
        switchLatest(map(text, countStream)),
        up.sample(countBtn('+'), countDown),
      ])
    ])
  )
})



