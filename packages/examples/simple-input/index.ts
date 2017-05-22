import { chain, map, merge, switchLatest, constant, periodic, scan } from '@most/core'
import { domEvent, branch, text, node, component, element, renderTo, style } from '../../dom'
import { pipe } from '../common'

const inputValue = pipe(
  chain(domEvent('input')),
  map(pipe(ev => ev.target.value, String))
)

const inputComponenet = component(({ input }) => {
  const inputElement = input.sample(inputValue, element('input'))

  const containerStyle = style(constant({background: '#e6e6e6', padding: '10px', display: 'flex', flexDirection: 'column'}))
  const container = containerStyle(node)

  return branch(container, merge(
    inputElement, // <node><input/></node>
    switchLatest(map(text, input)) // stream of text
  ))
})
