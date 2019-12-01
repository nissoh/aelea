import { constant, map, merge, scan, switchLatest } from '@most/core'
import { pipe } from '../utils'
import { style, branch, text, node, component, domEvent } from 'fufu'
import * as stylesheet from '../style/stylesheet'
import { row } from '../common/flex'


const styledBtn = stylesheet.btn(node)

const countBtn = (str: string) => style({ margin: '6px' }, branch(styledBtn, text(str)))
const add = (x: number, y: number) => (x + y)

const click = domEvent('click')





export default component({
  countUp: pipe(click, constant(1)),
  countDown: pipe(click, constant(-1))
}, ({ countUp, countDown }) => {
  const count = scan(add, 0, merge(countUp, countDown))

  return stylesheet.centerStyle(row(
    countUp.attach(countBtn('+1')),
    countDown.attach(countBtn('-1')),
    switchLatest(map(pipe(String, text), count))
  ))
})

