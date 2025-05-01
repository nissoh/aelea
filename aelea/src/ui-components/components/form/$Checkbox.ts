import { map, mergeArray } from '@most/core'
import { O } from '../../../core/common.js'
import type { Behavior } from '../../../core/types.js'
import {
  $element,
  $node,
  attr,
  attrBehavior,
  component,
  nodeEvent,
  style,
  styleBehavior,
} from '../../../dom/index.js'
import type { IBranch } from '../../../dom/types.js'
import { pallete } from '../../../ui-components-theme/globalState.js'
import { layoutSheet } from '../../style/layoutSheet.js'
import { dismissOp, interactionOp } from './form.js'
import type { Input } from './types.js'

export interface Checkbox extends Input<boolean> {}

export const $Checkbox = ({ value }: Checkbox) =>
  component(
    (
      [focusStyle, interactionTether]: Behavior<IBranch, true>,
      [dismissstyle, dismissTether]: Behavior<IBranch, false>,
      [check, checkTether]: Behavior<IBranch<HTMLInputElement>, boolean>,
    ) => {
      const $overlay = $node(
        layoutSheet.stretch,
        style({ flex: 1, margin: '3px' }),
        styleBehavior(
          map(
            (ch) => (ch ? { backgroundColor: pallete.message } : null),
            value,
          ),
        ),
      )

      const $checkInput = $element('input')(
        style({
          opacity: 0,
          width: 'inherit',
          height: 'inherit',
          margin: '0',
          cursor: 'pointer',
        }),
        layoutSheet.stretch,
        checkTether(
          nodeEvent('change'),
          map((evt) => (<HTMLInputElement>evt.target).checked),
        ),
        attr({ type: 'checkbox' }),
        attrBehavior(
          map((checked) => ({ checked: checked ? true : null }), value),
        ),
        interactionTether(interactionOp),
        dismissTether(dismissOp),
      )

      const containerStyle = O(
        styleBehavior(
          map(
            (active) => (active ? { borderColor: pallete.primary } : null),
            mergeArray([focusStyle, dismissstyle]),
          ),
        ),
        style({
          position: 'relative',
          width: '18px',
          height: '18px',
          border: `2px solid ${pallete.message}`,
        }),
      )

      return [$node(containerStyle)($overlay(), $checkInput()), { check }]
    },
  )
