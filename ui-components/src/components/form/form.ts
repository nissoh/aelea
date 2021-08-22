import { constant, filter, merge } from '@most/core'
import { O } from '@aelea/core'
import { $Node, $element, nodeEvent, style } from '@aelea/dom'
import layoutSheet from '../../style/layoutSheet'
import { pallete } from '@aelea/ui-components-theme'



export const interactionOp = O(
  (src: $Node) => merge(nodeEvent('focus', src), nodeEvent('pointerover', src)),
  constant(true)
)

export const dismissOp = O(
  (src: $Node) => merge(nodeEvent('blur', src), nodeEvent('pointerout', src)),
  filter(x => document.activeElement !== x.target,), // focused elements cannot be dismissed
  constant(false)
)


export const $form = $element('form')(layoutSheet.column)

export const $label = $element('label')(
  layoutSheet.column,
  style({ color: pallete.foreground })
)


