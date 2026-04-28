import { map, merge } from '../../../stream/index.js'
import type { IBehavior } from '../../../stream-extended/index.js'
import { pallete } from '../../../ui-components-theme/index.js'
import type { ISlottable } from '../../../ui-renderer-dom/index.js'
import {
  $element,
  $node,
  attr,
  attrBehavior,
  component,
  nodeEvent,
  style,
  styleBehavior
} from '../../../ui-renderer-dom/index.js'
import { layoutSheet } from '../../style/layoutSheet.js'
import { dismissOp, interactionOp } from './form.js'
import type { Input } from './types.js'

export interface Checkbox extends Input<boolean> {}

export const $Checkbox = ({ value }: Checkbox) =>
  component(
    (
      [focusStyle, interactionTether]: IBehavior<ISlottable<HTMLInputElement>, boolean>,
      [dismissstyle, dismissTether]: IBehavior<ISlottable<HTMLInputElement>, boolean>,
      [check, checkTether]: IBehavior<ISlottable<HTMLInputElement>, boolean>
    ) => {
      const $overlay = $node(
        layoutSheet.stretch,
        style({ flex: 1, margin: '3px' }),
        styleBehavior(map(ch => (ch ? { backgroundColor: pallete.message } : null), value))
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
          map(evt => (<HTMLInputElement>evt.target).checked)
        ),
        attr({ type: 'checkbox' }),
        attrBehavior(map(checked => ({ checked: checked ? true : null }), value)),
        interactionTether(interactionOp),
        dismissTether(dismissOp)
      )

      const $container = $node(
        styleBehavior(
          map(active => (active ? { borderColor: pallete.primary } : null), merge(focusStyle, dismissstyle))
        ),
        style({
          position: 'relative',
          width: '18px',
          height: '18px',
          border: `2px solid ${pallete.message}`
        })
      )

      return [
        $container(
          $overlay(), //
          $checkInput()
        ),
        { check }
      ]
    }
  )
