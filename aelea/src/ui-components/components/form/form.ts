import type { IOps } from '../../../stream/index.js'
import { constant, filter, merge } from '../../../stream/index.js'
import { pallete } from '../../../ui-components-theme/index.js'
import type { ISlottable } from '../../../ui-renderer-dom/index.js'
import { $element, nodeEvent, style } from '../../../ui-renderer-dom/index.js'
import { layoutSheet } from '../../style/layoutSheet.js'

export const interactionOp: IOps<ISlottable, boolean> = source =>
  constant(true, merge(nodeEvent('focus', source), nodeEvent('pointerover', source)))

export const dismissOp: IOps<ISlottable, boolean> = source => {
  const events = merge(nodeEvent('blur', source), nodeEvent('pointerout', source))
  return constant(
    false,
    filter(ev => document.activeElement !== ev.target, events)
  )
}

export const $form = $element('form')(layoutSheet.column)

export const $label = $element('label')(layoutSheet.column, style({ color: pallete.foreground }))
