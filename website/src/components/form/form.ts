import { $element, $Node, event, O, style } from '@aelea/core'
import { layoutSheet } from '@aelea/ui-components'
import { theme } from '@aelea/ui-components-theme'
import { constant, filter, merge } from '@most/core'
import { Stream } from '@most/types'


export enum InputType {
  TEXT = 'text',
  NUMBER = 'number'
}

export interface Control {
  disabled?: Stream<boolean>,
}

export interface Input<T> extends Control {
  value: Stream<T>
}


export const interactionOp = O(
  (src: $Node) => merge(event('focus', src), event('pointerover', src)),
  constant(true)
)

export const dismissOp = O(
  (src: $Node) => merge(event('blur', src), event('pointerout', src)),
  filter(x => document.activeElement !== x.target,), // focused elements cannot be dismissed
  constant(false)
)


export const $form = $element('form')(layoutSheet.column)



export const $label = $element('label')(
  layoutSheet.row,
  style({ alignItems: 'center', cursor: 'pointer', color: theme.system })
)


