import type { IOps, IStream } from '../../../stream/index.js'
import { constant, filter, map, merge } from '../../../stream/index.js'
import { palette } from '../../../ui-components-theme/index.js'
import type { IMutator, INode, ISlottable } from '../../../ui-renderer-dom/index.js'
import { $element, makeMutator, nodeEvent, style, styleBehavior } from '../../../ui-renderer-dom/index.js'
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

export const disabledOp = (disabled: IStream<boolean>): IMutator =>
  makeMutator((node: INode) => {
    node.styleBehavior.push(map(d => (d ? { opacity: 0.4, pointerEvents: 'none' } : null), disabled))
    node.attributesBehavior.push(map(d => ({ disabled: d }), disabled))
    return node
  })

export const focusOutlineOp = (focus: IStream<boolean>, dismiss: IStream<boolean>): IMutator =>
  styleBehavior(map(active => (active ? { borderColor: palette.primary } : null), merge(focus, dismiss)))

export const $form = $element('form')(layoutSheet.column)

export const $label = $element('label')(layoutSheet.column, style({ color: palette.foreground }))
