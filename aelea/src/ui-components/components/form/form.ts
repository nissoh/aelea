import { constant, filter, merge } from '@most/core'
import { O } from '../../../core/common.js'
import { $element, nodeEvent, style } from '../../../core/index.js'
import type { I$Node, I$Slottable } from '../../../core/source/node.js'
import { pallete } from '../../../ui-components-theme/globalState.js'
import { layoutSheet } from '../../style/layoutSheet.js'

export const interactionOp = O(
  (src: I$Node) => merge(nodeEvent('focus')(src), nodeEvent('pointerover')(src)),
  constant(true)
)

export const dismissOp = O(
  (src: I$Node) => merge(nodeEvent('blur')(src), nodeEvent('pointerout')(src)),
  filter((x) => document.activeElement !== x.target), // focused elements cannot be dismissed
  constant(false)
)

export const $form = $element('form')(layoutSheet.column)

export const $label = $element('label')(layoutSheet.column, style({ color: pallete.foreground }))
