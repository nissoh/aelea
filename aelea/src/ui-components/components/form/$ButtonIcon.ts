import { map, merge, never } from '../../../stream/index.js'
import type { IBehavior } from '../../../stream-extended/index.js'
import { colorShade, palette } from '../../../ui-components-theme/index.js'
import type { I$Slottable, ISlottable } from '../../../ui-renderer-dom/index.js'
import {
  $element,
  attrBehavior,
  component,
  type INodeCompose,
  nodeEvent,
  style,
  styleBehavior
} from '../../../ui-renderer-dom/index.js'
import { designSheet } from '../../style/designSheet.js'
import { dismissOp, interactionOp } from './form.js'
import type { Control } from './types.js'

export const $defaultButtonIconContainer = $element('button')(
  designSheet.control,
  style({
    cursor: 'pointer',
    fill: palette.message,
    border: `1px solid ${colorShade(palette.message, 25)}`,
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    padding: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  })
)

export interface IButtonIcon extends Control {
  $content: I$Slottable
  $container?: INodeCompose<HTMLButtonElement>
}

export const $ButtonIcon = ({ $content, disabled = never, $container = $defaultButtonIconContainer }: IButtonIcon) =>
  component(
    (
      [focusStyle, interactionTether]: IBehavior<ISlottable<HTMLButtonElement>, boolean>,
      [dismissstyle, dismissTether]: IBehavior<ISlottable<HTMLButtonElement>, boolean>,
      [click, clickTether]: IBehavior<ISlottable<HTMLButtonElement>, PointerEvent>
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
