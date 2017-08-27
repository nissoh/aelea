
import {  branch, node, component, text, domEvent, style, nullSink } from 'fufu'
import { constant, merge, join } from '@most/core'
import { pipe, xForver } from '../utils'
import * as commonSSheet from '../stylesheet'
import { counter } from './counter'
import { newDefaultScheduler } from '@most/scheduler'


const addBtnStyle = pipe(commonSSheet.btn, style({
  width: '70px', textAlign: 'center', marginBottom: '25px', color: '#ffffff',
  background: '#e65656', borderRadius: '4px', display: 'block', padding: '5px 0'
}))
const btn = addBtnStyle(branch(node, text('add')))


const actions = {
  count: pipe(domEvent('click'), constant(1))
}

const countersComponent = component(actions, ({ count }) => {
  const styledCounter = style(constant({margin: '10px 0'}) , counter)

  return branch(node, merge(
    count.sample(btn),
    join(constant(styledCounter, count))
  ))
})


branch(xForver(document.body), commonSSheet.mainCentered(countersComponent))
  .run(nullSink, newDefaultScheduler())

