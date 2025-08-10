import { constant, filter, merge, o } from '../../../stream/index.js'
import { $element, nodeEvent, style } from '../../../ui/index.js'
import type { I$Node } from '../../../ui/types.js'
import { pallete } from '../../../ui-components-theme/globalState.js'
import { layoutSheet } from '../../style/layoutSheet.js'

export const interactionOp = o(
  (src: I$Node) => merge(nodeEvent('focus')(src), nodeEvent('pointerover')(src)),
  constant(true)
)

export const dismissOp = o(
  (src: I$Node) => {
    const newLocal = merge(nodeEvent('blur', src), nodeEvent('pointerout', src))
    return newLocal
  },
  filter(x => document.activeElement !== x.target), // focused elements cannot be dismissed
  constant(false)
)

export const $form = $element('form')(layoutSheet.column)

export const $label = $element('label')(layoutSheet.column, style({ color: pallete.foreground }))
