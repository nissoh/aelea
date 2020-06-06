import { style, component, $element, O, event, $text, attr, StyleCSS, DomNode, Behavior, Sample } from 'fufu'
import { $column } from './flex'
import * as stylesheet from '../style/stylesheet'
import { constant } from '@most/core'


export enum InputType {
  TEXT = 'text',
  NUMBER = 'number'
}

export interface Input {
  type?: InputType
  value?: string | number
  placeholder?: string | undefined
}

export interface Field extends Input {
  label: string
}

const blurStyleOp = O(
  event('blur'),
  constant(<StyleCSS>{ borderBottom: '1px solid rgb(210, 210, 210, 0.4)' })
)

const focusStyleOp = O(
  event('focus'),
  constant(<StyleCSS>{ borderBottom: '1px solid rgb(210, 210, 210)' })
)

export const $input =
  (props: Input, inputBehavior: Sample<DomNode, KeyboardEvent>) =>
    component((
      [focusBehaviorm, focusStyle]: Behavior<DomNode, StyleCSS>,
      [blurBehavior, blurStyle]: Behavior<DomNode, StyleCSS>
    ) =>
      $element('input')(
        attr({ type: props.type ?? InputType.TEXT, value: props.value ?? '' }),
        stylesheet.input,

        style(focusStyle),
        style(blurStyle),

        focusBehaviorm(blurStyleOp),
        blurBehavior(focusStyleOp),

        inputBehavior(event('keyup')),
      )()
    )


const $label = $element('label')(
  style({
    fontSize: '0.7rem',
    color: '#9a9a9a'
  })
)

export const $field = (props: Field, inputBeavior: Sample<DomNode, KeyboardEvent>) =>
  component(() =>
    $column(stylesheet.flex)(
      $label(
        $text(props.label)
      ),
      $input(props, inputBeavior)
    )
  )






