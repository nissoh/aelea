
import {branch, node, component, text, domEvent, style, nullSink} from 'fufu'
import {constant, join} from '@most/core'
import {pipe, xForver} from '../utils'
import * as commonSSheet from '../style/stylesheet'
import counter from './counter'
import {newDefaultScheduler} from '@most/scheduler'
import {column} from '../common/flex'


const addBtnStyle = pipe(commonSSheet.btn, style({
  width: '70px', textAlign: 'center', color: '#ffffff',
  background: '#e65656', borderRadius: '4px', display: 'block', padding: '5px 0'
}))
const btn = addBtnStyle(branch(node, text('add')))


const actions = {
  count: pipe(domEvent('click'), constant(1))
}


const countersComponent = component(actions, ({count}) => {
  const styledCounter = style({margin: '10px 0'}, counter)

  return column(
    count.attach(btn),
    join(constant(styledCounter, count))
  )
})


branch(xForver(document.body), commonSSheet.mainCentered(countersComponent))
  .run(nullSink, newDefaultScheduler())
