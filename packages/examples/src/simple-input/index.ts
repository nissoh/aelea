
import { map, switchLatest, merge } from '@most/core'
import { pipe, xForver } from '../utils'
import { nullSink, component, domEvent, style, branch, node, element, text } from 'fufu'
import { newDefaultScheduler } from '@most/scheduler'
import { inputStyleBehaviour, mainCentered } from '../stylesheet'

const containerStyle = pipe(mainCentered, style({
  padding: '10px',
  display: 'flex'
}))

const input = inputStyleBehaviour(element('input'))

const actions = {
  fufu: pipe(domEvent('input'), map(x => (x.target as HTMLInputElement).value + '-fufu'))
}

const inputComponenet = component(actions, ({ fufu }) => {
  const container = branch(containerStyle(node), branch(node, merge(
    fufu.sample(input),
    switchLatest(map(text, fufu))
  )))

  return container
})


branch(xForver(document.body), inputComponenet)
  .run(nullSink, newDefaultScheduler())
