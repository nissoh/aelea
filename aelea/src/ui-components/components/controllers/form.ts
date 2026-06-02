import type { IOps, IStream } from '../../../stream/index.js'
import { constant, filter, just, map, merge, switchMap } from '../../../stream/index.js'
import { type PromiseState, PromiseStatus, promiseState } from '../../../stream-extended/index.js'
import { palette } from '../../../ui-components-theme/index.js'
import type { IMutator, INode, ISlottable, IStyleCSS } from '../../../ui-renderer-dom/index.js'
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

export type DisabledState = boolean | PromiseState<unknown>

export const resolveDisabledState = (source: IStream<boolean | Promise<unknown>>): IStream<DisabledState> =>
  switchMap((v): IStream<DisabledState> => (v instanceof Promise ? promiseState(just(v)) : just(v)), source)

export const isDisabled = (s: DisabledState): boolean =>
  typeof s === 'boolean' ? s : s.status === PromiseStatus.PENDING

const disabledStyleStream = (state: IStream<DisabledState>): IStream<IStyleCSS | null> =>
  map((s): IStyleCSS | null => {
    if (typeof s === 'boolean') {
      return s ? { opacity: 0.4, pointerEvents: 'none', cursor: 'not-allowed' } : null
    }
    return s.status === PromiseStatus.PENDING ? { pointerEvents: 'none', cursor: 'wait' } : null
  }, state)

export const disabledStyleOp = (disabled: IStream<boolean | Promise<unknown>>): IMutator => {
  const state = resolveDisabledState(disabled)
  return makeMutator((node: INode) => {
    node.styleBehavior.push(disabledStyleStream(state))
    return node
  })
}

export const disabledOp = (disabled: IStream<boolean | Promise<unknown>>): IMutator => {
  const state = resolveDisabledState(disabled)
  return makeMutator((node: INode) => {
    node.styleBehavior.push(disabledStyleStream(state))
    node.attributesBehavior.push(map(s => ({ disabled: isDisabled(s) ? '' : null }), state))
    return node
  })
}

export const focusOutlineOp = (focus: IStream<boolean>, dismiss: IStream<boolean>): IMutator =>
  styleBehavior(map(active => (active ? { borderColor: palette.primary } : null), merge(focus, dismiss)))

export const $form = $element('form')(layoutSheet.column)

export const $label = $element('label')(layoutSheet.column, style({ color: palette.foreground }))
