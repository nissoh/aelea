import { renderTo, branch, node, component, Component, text, domEvent, style } from '../../dom'
import { constant, periodic, map, merge, chain, scan, switchLatest, until, skip } from '@most/core'
import { pipe, centerStyle, mainCentered, displayFlex, row } from '../common'
import * as stylesheet from './stylesheet'
import { Disposable } from '@most/types'

const countButton =  style(constant(stylesheet.countBtn), node)

const countBtn = (str: string) => branch(countButton, text(str))

const countUpBtn = countBtn('+1')
const countDownBtn = countBtn('-1')

const add = (x: number, y: number) => x + y

export const counter = component(({ countUp, countDown }) => {
  const countUpComp = pipe(chain(domEvent('click')), constant(1))
  const countDownComp = pipe(chain(domEvent('click')), constant(-1))

  const count = scan(add, 0, merge(countUp, countDown))

  return branch(row, merge(
    countUp.sample(countUpComp, countUpBtn),
    countDown.sample(countDownComp, countDownBtn),
    switchLatest(map(pipe(String, text), count))
  ))
})
