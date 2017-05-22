
import { Stream } from '@most/types'
import { chain, map, combine, switchLatest, constant, merge, just, periodic, until, skip, tap } from '@most/core'
import { compose } from '@most/prelude'
import { domEvent, branch, text, node, component, element, renderTo, style } from '../../dom'
import { displayFlex, centerStyle, pipe, inputEl, row, mainCentered } from '../common'

const add = (x: number, y: number) => x + y
const toBg = (bg: string) => ({ backgroundColor: bg })

const inputValue = pipe(
  chain(domEvent('input')),
  map(compose(Number, (ev) => ev.target.value))
)

const addComponent = component(({ x, y }) => {
  const sum = combine(add, x, y)

  return branch(style(constant(displayFlex), node), merge(
    node,
    x.sample(inputValue, inputEl),
    y.sample(inputValue, inputEl),
    branch(row, switchLatest(map(pipe(String, text), sum)))
  ))
})

const main = branch(style(constant(centerStyle), mainCentered), addComponent)

renderTo(document.body, main)
