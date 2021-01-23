import { constant, filter, merge } from '@most/core'
import { Stream } from '@most/types'
import { $Node, $element, event, O, style } from '@aelea/core'
import * as designSheet from '../../common/stylesheet'


export enum InputType {
  TEXT = 'text',
  NUMBER = 'number'
}

export interface Control {
  disabled?: Stream<boolean>,
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


export const $form = $element('form')(designSheet.column)



export const $label = $element('label')(
  designSheet.row,
  style({ alignItems: 'center', cursor: 'pointer', color: designSheet.theme.system })
)


