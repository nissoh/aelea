
import {map, switchLatest, tap, startWith, never, empty, chain, merge, constant, scan} from '@most/core'
import {component, text, style, element, pipe, customElement, NodeStream, nullSink, DomNode, applyStyle, domEvent, node, Op, renderAt} from 'fufu'
import {newDefaultScheduler} from '@most/scheduler'
import * as stylesheet from '../style/stylesheet'
import {column, row} from '../common/flex'



const btn = (str: string) => pipe(node, stylesheet.btn)(text(str))

const counter = component(({up, down}) => {

  const nikaContainer = pipe(
    node,
    style({backgroundColor: '#ffc0cb4f', padding: '10px', margin: '10px'})
  )

  const countUp = up.sample(
    btn('+'),
    domEvent('click')
  )

  const countDown = down.sample(
    btn('+'),
    domEvent('click')
  )

  const count = merge(constant(1, up), constant(-1, down))
  const counting: Op<number, string> = pipe(scan((acc, x) => acc + x, 0), map(String))

  return nikaContainer([
    row([
      countUp,
      switchLatest(map(text, counting(count))),
      countDown,
    ]),
    countCounter
  ])
})


const countCounter = component(({add, remove}) => column([
  row([
    add.sample(btn('Add One'), domEvent('click')),
    remove.sample(btn('Remove One'), domEvent('click'))
  ]),
  chain(add => column(counter), add)
]))




renderAt(document.body, countCounter).run({
  event(t, ev) {
    // document.body.appendChild(node)
  },
  error(e) {
    throw e
  },
  end() {
  }
}, newDefaultScheduler())


