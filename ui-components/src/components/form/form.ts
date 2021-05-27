import { constant, filter, merge } from '@most/core'
import { O } from '@aelea/utils'
import { $Node, $element, event, style } from '@aelea/core'
import layoutSheet from '../../style/layoutSheet'
import { pallete } from '@aelea/ui-components-theme'



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
  layoutSheet.column,
  style({ color: pallete.foreground })
)


