
import { node, component, text, domEvent, style, pipe, renderAt} from 'fufu'
import {constant, join} from '@most/core'
import * as stylesheet from '../style/stylesheet'
import counter from './counter'
import {newDefaultScheduler} from '@most/scheduler'
import {column, row} from '../common/flex'


const addBtnStyle = pipe(stylesheet.btn, style({
  width: '70px', textAlign: 'center', color: '#ffffff',
  background: '#e65656', borderRadius: '4px', display: 'block', padding: '5px 0'
}))

const btn = pipe(node, addBtnStyle)


const countersComponent = component(({add}) => column([
  row([
    add.sample(btn(text('Add One')), domEvent('click'))
  ]),
  join(constant(counter, add))
]))



renderAt(document.body, stylesheet.mainCentered(countersComponent)).run({
  event() {
  },
  error(e) {
    throw e
  },
  end() {
  }
}, newDefaultScheduler())