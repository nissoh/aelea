import { map, merge, never } from '../../../stream/index.js'
import type { IBehavior } from '../../../stream-extended/index.js'
import { palette } from '../../../ui-components-theme/index.js'
import type { I$Slottable, ISlottable } from '../../../ui-renderer-dom/index.js'
import {
  $element,
  attrBehavior,
  component,
  type INodeCompose,
  nodeEvent,
  styleBehavior
} from '../../../ui-renderer-dom/index.js'
import { designSheet } from '../../style/designSheet.js'
import { dismissOp, interactionOp } from './form.js'
import type { Control } from './types.js'

export const $defaultButtonContainer = $element('button')(designSheet.btn)

export interface IButton extends Control {
  $content: I$Slottable
  $container?: INodeCompose<HTMLButtonElement>
}

export const $Button = ({ disabled = never, $content, $container = $defaultButtonContainer }: IButton) =>
  component(
    (
      [focusStyle, interactionTether]: IBehavior<ISlottable, boolean>,
      [dismissstyle, dismissTether]: IBehavior<ISlottable, boolean>,
      [click, clickTether]: IBehavior<ISlottable, PointerEvent>
    ) => [
      $container(
        clickTether(nodeEvent('pointerup')),
        styleBehavior(map(d => (d ? { opacity: 0.4, pointerEvents: 'none' } : null), disabled)),
        attrBehavior(map(d => ({ disabled: d }), disabled)),
        styleBehavior(
          map(active => (active ? { borderColor: palette.primary } : null), merge(focusStyle, dismissstyle))
        ),
        interactionTether(interactionOp),
        dismissTether(dismissOp)
      )($content),
      { click }
    ]
  )
