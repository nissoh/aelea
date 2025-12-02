import { map, merge } from '@/stream'
import type { IBehavior } from '@/stream-extended'
import { pallete } from '@/ui-components-theme'
import type { I$Node, INode } from '@/ui-renderer-dom'
import { $element, $node, attr, attrBehavior, component, nodeEvent, style, styleBehavior } from '@/ui-renderer-dom'
import { layoutSheet } from '../../style/layoutSheet.js'
import { dismissNodeOp, interactionNodeOp } from './form.js'
import type { Input } from './types.js'

export interface Checkbox extends Input<boolean> {}

export const $Checkbox = ({ value }: Checkbox) =>
  component(
    (
      [focusStyle, interactionTether]: IBehavior<I$Node, boolean>,
      [dismissstyle, dismissTether]: IBehavior<I$Node, boolean>,
      [check, checkTether]: IBehavior<INode<HTMLInputElement>, boolean>
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
        interactionTether(interactionNodeOp),
        dismissTether(dismissNodeOp)
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
