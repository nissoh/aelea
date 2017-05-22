
import { renderTo, branch, node, component, text, domEvent, style, future } from '../../dom'
import { constant, periodic, map, merge, chain, switchLatest, join, just, tap, skip, until } from '@most/core'
import { pipe, centerStyle, mainCentered, displayFlex, column, always } from '../common'
import * as stylesheet from './stylesheet'
import { counter } from './counter'
import { newDefaultScheduler } from '@most/scheduler'

const randomFabulousness = () => '#' + (Math.random() * 0xFFFFFF << 0).toString(16)

// const rainbowBackground = pipe(periodic, map(() => ({ backgroundColor: randomFabulousness() })))

const addBtnStyle = style(constant({...stylesheet.button, width: '70px', textAlign: 'center', marginBottom: '25px', color: '#ffffff', background: '#e65656', borderRadius: '4px', display: 'block', padding: '5px 0'}))
const btn = addBtnStyle(branch(node, text('add')))

const countersComponent = component(({ count }) => {
  const chainComp = pipe(chain(domEvent('click')), constant(1))
  const styledCounter = style(constant({margin: '10px 0'}) , counter)

  return branch(node, merge(
    count.sample(chainComp, btn),
    join(constant(styledCounter, count))
  ))
})

const main = branch(style(constant({ flexDirection: 'column', ...centerStyle }), mainCentered), countersComponent)

renderTo(document.body, main)

// const www = until(tap(console.log, skip(1, periodic(1000))), node)
// renderTo(document.body, www)
