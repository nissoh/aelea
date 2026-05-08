import { never } from '../../../stream/index.js'
import type { IBehavior } from '../../../stream-extended/index.js'
import { colorWeight, palette, text } from '../../../ui-components-theme/index.js'
import type { I$Slottable, ISlottable } from '../../../ui-renderer-dom/index.js'
import { $element, component, type INodeCompose, nodeEvent, style } from '../../../ui-renderer-dom/index.js'
import { disabledOp, dismissOp, focusOutlineOp, interactionOp } from './form.js'
import type { Control } from './types.js'

export const $defaultButtonIconContainer = $element('button')(
  style({
    fontFamily: 'inherit',
    fontWeight: 300,
    fontSize: text.base,
    color: palette.message,
    fill: palette.message,
    backgroundColor: 'transparent',
    border: `1px solid ${colorWeight(palette.message, 25)}`,
    outline: 'none',
    cursor: 'pointer',
    borderRadius: '50%',
    aspectRatio: '1 / 1',
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
        disabledOp(disabled),
        focusOutlineOp(focusStyle, dismissstyle),
        interactionTether(interactionOp),
        dismissTether(dismissOp)
      )($content),
      { click }
    ]
  )
