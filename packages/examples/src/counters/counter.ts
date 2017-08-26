import { constant, map, merge, scan, switchLatest, mergeArray } from '@most/core'
import { pipe } from '../utils'
import { style, branch, text, node, component, domEvent } from '@fufu/core'
import * as stylesheet from '../stylesheet'


const styledBtn = stylesheet.btn(node)
const centeredContainer = pipe(stylesheet.centerStyle, stylesheet.row)(node)

const countBtn = (str: string) => style({ margin: '6px' }, branch(styledBtn, text(str)))
const add = (x: number, y: number) => (x + y)

const click = domEvent('click')

const actions = {
  countUp:   pipe(click, constant(1)),
  countDown: pipe(click, constant(-1))
}

export const counter = component(actions, ({ countUp, countDown }) => {
  const count = scan(add, 0, merge(countUp, countDown))

  return branch(centeredContainer, mergeArray([
    countUp.sample(countBtn('+1')),
    countDown.sample(countBtn('-1')),
    switchLatest(map(pipe(String, text), count))
  ]))
})
