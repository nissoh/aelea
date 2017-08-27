
import { map, combine, switchLatest, mergeArray } from '@most/core'
import { compose } from '@most/prelude'
import { domEvent, branch, text, node, component, element, nullSink } from 'fufu'
import { pipe, xForver } from '../utils'
import { newDefaultScheduler } from '@most/scheduler'
import * as commonSSheet from '../stylesheet'


const add = (x: number, y: number) => x + y

const inputValue = pipe(
  domEvent('input'),
  map(compose(Number, (ev: Event) => (ev.target as HTMLInputElement).value))
)

const actions = {
  x: inputValue,
  y: inputValue
}

const input = commonSSheet.inputStyleBehaviour(element('input'))


const addComponent = component(actions, ({ x, y }) => {
  const sum = combine(add, x, y)

  return branch(commonSSheet.row(node), mergeArray([
    x.sample(input),
    y.sample(input),
    branch(commonSSheet.row(node), switchLatest(map(pipe(String, text), sum)))
  ]))
})


branch(xForver(document.body), commonSSheet.mainCentered(branch(node, addComponent)))
  .run(nullSink, newDefaultScheduler())
