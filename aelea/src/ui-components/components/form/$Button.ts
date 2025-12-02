import { type IOps, map, merge, never, op } from '@/stream'
import type { IBehavior } from '@/stream-extended'
import { pallete } from '@/ui-components-theme'
import type { I$Node, I$Slottable, INode, ISlottable, IStyleCSS } from '@/ui-renderer-dom'
import { $element, attrBehavior, component, nodeEvent, styleBehavior } from '@/ui-renderer-dom'
import { designSheet } from '../../style/designSheet.js'
import { dismissOp, interactionOp } from './form.js'
import type { Control } from './types.js'

export interface IButton extends Control {
  $content: I$Slottable
  buttonStyle?: IStyleCSS
  buttonOp?: IOps<INode<HTMLButtonElement>>
}

export const $Button = ({ disabled = never, $content, buttonOp = op }: IButton) =>
  component(
    (
      [focusStyle, interactionTether]: IBehavior<ISlottable, boolean>,
      [dismissstyle, dismissTether]: IBehavior<ISlottable, boolean>,
      [click, clickTether]: IBehavior<ISlottable, PointerEvent>
    ) => {
      const $button = $element('button')(
        designSheet.btn,
        clickTether(nodeEvent('pointerup')),
        styleBehavior(map(disabled => (disabled ? { opacity: 0.4, pointerEvents: 'none' } : null), disabled)),

        attrBehavior(map(disabled => ({ disabled }), disabled)),

        styleBehavior(
          map(active => (active ? { borderColor: pallete.primary } : null), merge(focusStyle, dismissstyle))
        ),

        interactionTether(interactionOp),
        dismissTether(dismissOp),
        buttonOp
      )

      return [
        $button($content),

        {
          click
        }
      ]
    }
  )
