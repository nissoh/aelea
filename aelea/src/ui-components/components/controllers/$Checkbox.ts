import { combine, type IStream, map, merge, never, op, start } from '../../../stream/index.js'
import { type IBehavior, state } from '../../../stream-extended/index.js'
import { palette } from '../../../ui-components-theme/index.js'
import type { ISlottable } from '../../../ui-renderer-dom/index.js'
import {
  $element,
  $node,
  $text,
  attr,
  attrBehavior,
  component,
  effectProp,
  type INodeCompose,
  nodeEvent,
  style,
  styleBehavior
} from '../../../ui-renderer-dom/index.js'
import { layoutSheet } from '../../style/layoutSheet.js'
import { spacing } from '../../style/spacing.js'
import { disabledStyleOp, dismissOp, interactionOp, isDisabled, resolveDisabledState } from './form.js'
import type { Input } from './types.js'

export const $defaultCheckboxLabel = $element('label')(
  spacing.small,
  style({
    display: 'inline-flex',
    alignItems: 'center',
    cursor: 'pointer',
    userSelect: 'none'
  })
)

export const $defaultCheckboxBox = $node(
  style({
    position: 'relative',
    width: '18px',
    height: '18px',
    border: `2px solid ${palette.message}`,
    flexShrink: 0
  })
)

export interface I$Checkbox extends Input<boolean> {
  label?: string
  $container?: INodeCompose<HTMLLabelElement>
  $box?: INodeCompose<HTMLElement>
}

export const $Checkbox = ({
  value,
  disabled = never,
  label,
  $container = $defaultCheckboxLabel,
  $box = $defaultCheckboxBox
}: I$Checkbox) =>
  component(
    (
      [focusStyle, interactionTether]: IBehavior<ISlottable<HTMLElement>, boolean>,
      [dismissstyle, dismissTether]: IBehavior<ISlottable<HTMLElement>, boolean>,
      [check, checkTether]: IBehavior<ISlottable<HTMLInputElement>, boolean>
    ) => {
      const blocked: IStream<boolean> = op(disabled, resolveDisabledState, map(isDisabled), state())
      const valueShared = op(value, state())

      const focusBorder = styleBehavior(
        op(
          combine({ active: start(false, merge(focusStyle, dismissstyle)), d: blocked }),
          map(p => (!p.d && p.active ? { borderColor: palette.primary } : null))
        )
      )

      const $overlay = $node(
        layoutSheet.stretch,
        style({ margin: '3px' }),
        styleBehavior(
          op(
            valueShared,
            map(ch => (ch ? { backgroundColor: palette.message } : null))
          )
        )
      )

      const $checkInput = $element('input')(
        style({
          opacity: 0,
          width: 'inherit',
          height: 'inherit',
          margin: '0',
          cursor: 'pointer'
        }),
        layoutSheet.stretch,
        checkTether(
          nodeEvent('change'),
          map(evt => (evt.target as HTMLInputElement).checked)
        ),
        attr({ type: 'checkbox' }),
        attrBehavior(
          op(
            valueShared,
            map(checked => ({ checked: checked ? true : null }))
          )
        ),
        effectProp('disabled', blocked),
        interactionTether(interactionOp),
        dismissTether(dismissOp)
      )

      return [
        label === undefined
          ? $box(disabledStyleOp(disabled), focusBorder)($overlay(), $checkInput())
          : $container(
              disabledStyleOp(disabled),
              interactionTether(interactionOp),
              dismissTether(dismissOp)
            )($box(focusBorder)($overlay(), $checkInput()), $text(label)),
        { check }
      ]
    }
  )
