import {style, component, text, pipe, element, domEvent, SplitBehavior, branch, behavior, ElementNode} from 'fufu'
import styleList from '../style/stylesheet'
import {empty, map, switchLatest, sample, tap} from '@most/core'
import {column} from './flex'
import {Stream} from '@most/types'


const labelStyle = pipe(text, style({
  textTransform: 'uppercase',
  fontSize: '11px',
  color: '#9a9a9a'
}))


interface Input {
  type: 'text' | 'number' | 'input' | undefined
  value: string
  placeholder?: string | undefined
}

interface Field extends Input {
  label?: string | undefined
}


const input = component(input => {


  const focusStyle = behavior(style({borderBottom: '1px solid red'}), domEvent('focus'))
  const borderStyle = behavior(style({borderBottom: '1px solid rgb(210, 210, 210)'}), domEvent('blur'))

  const mouseInteractions = pipe(focusStyle, borderStyle)

  const inputValue = pipe(
    domEvent('input'),
    map(ev =>
      ev.target instanceof HTMLInputElement ? ev.target.value : ''
    )
  )


  return [element('input', mouseInteractions), inputValue]
})


export const field = component(value =>
  column(
    input(tap(x => {}))
  )
)




