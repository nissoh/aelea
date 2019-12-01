
import { map, switchLatest, combine, startWith } from '@most/core'
import { domEvent, component, branch, nullSink, node, text, style } from 'fufu'
import { pipe, xForver } from '../utils'
import { newDefaultScheduler } from '@most/scheduler'
import * as commonSSheet from '../style/stylesheet'
import { row, column } from '../common/flex'
import { numberField } from '../common/form'
import { Stream } from '@most/types'



const add = (x: number, y: number) => x + y



const targetInputValue = (el: HTMLInputElement | null) => el && el.value
const targetEventValue = pipe(pipe((x: Event) => x.target as HTMLInputElement, targetInputValue), Number)

const inputValue = (x: HTMLElement) => {
  const input = x.querySelector('input')
  const inputEv = map(targetEventValue, domEvent('input', x))

  if (input) {
    return startWith(Number(input.value), inputEv)
  }

  return inputEv
}

const actions = {
  x: inputValue,
  y: inputValue
}


const sumText = (x: Stream<number>, y: Stream<number>) => switchLatest(map(pipe(String, text), combine(add, x, y)))

const fieldx = numberField('X')
const fieldy = numberField('Y')

const seperator = style({ width: '26px' }, node)

const addComponent = component(actions, ({ x, y }) => row(
  x.attach(fieldx),
  seperator,
  y.attach(fieldy),
  row(
    sumText(x, y)
  )
))


const body = branch(xForver(document.body))




body(
  commonSSheet.mainCentered(column(
    addComponent,
    style({ height: '50px' }, node),
    addComponent
  ))
)
  .run(nullSink, newDefaultScheduler())




