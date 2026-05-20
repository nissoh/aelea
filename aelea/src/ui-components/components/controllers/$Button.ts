import { never } from '../../../stream/index.js'
import type { IBehavior } from '../../../stream-extended/index.js'
import { interaction, palette, text } from '../../../ui-components-theme/index.js'
import type { I$Slottable, ISlottable } from '../../../ui-renderer-dom/index.js'
import {
  $element,
  component,
  type INodeCompose,
  nodeEvent,
  style,
  stylePseudo
} from '../../../ui-renderer-dom/index.js'
import { disabledOp, dismissOp, focusOutlineOp, interactionOp } from './form.js'
import type { Control } from './types.js'

export const $defaultButtonContainer = $element('button')(
  style({
    fontFamily: 'inherit',
    fontWeight: 300,
    fontSize: text.base,
    color: palette.message,
    backgroundColor: 'transparent',
    border: `2px solid ${palette.message}`,
    outline: 'none',
    flexShrink: 0,
    cursor: 'pointer',
    padding: '5px 15px',
    display: 'flex',
    alignItems: 'center'
  }),
  stylePseudo(':hover', { filter: interaction.hoverFilter }),
  stylePseudo(':active', { filter: interaction.activeFilter })
)

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
        disabledOp(disabled),
        focusOutlineOp(focusStyle, dismissstyle),
        interactionTether(interactionOp),
        dismissTether(dismissOp)
      )($content),
      { click }
    ]
  )
