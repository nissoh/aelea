import { map, mergeArray, never } from '@most/core'
import type { IBehavior } from '../../../core/combinator/behavior.js'
import type { IStyleCSS } from '../../../core/combinator/style.js'
import type { IOps } from '../../../core/common.js'
import { $element, attrBehavior, component, nodeEvent, styleBehavior } from '../../../core/index.js'
import type { I$Slottable, INode, ISlottable } from '../../../core/source/node.js'
import { pallete } from '../../../ui-components-theme/globalState.js'
import { designSheet } from '../../style/designSheet.js'
import { dismissOp, interactionOp } from './form.js'
import type { Control } from './types.js'

export interface IButton extends Control {
  $content: I$Slottable
  buttonStyle?: IStyleCSS
  buttonOp?: IOps<INode<HTMLButtonElement>, INode<HTMLButtonElement>>
}

export const $Button = ({ disabled = never(), $content, buttonOp = o() }: IButton) =>
  component(
    (
      [focusStyle, interactionTether]: IBehavior<INode, true>,
      [dismissstyle, dismissTether]: IBehavior<INode, false>,
      [click, clickTether]: IBehavior<ISlottable, PointerEvent>
    ) => {
      const $button = $element('button')(
        designSheet.btn,
        clickTether(nodeEvent('pointerup')),
        styleBehavior(map((disabled) => (disabled ? { opacity: 0.4, pointerEvents: 'none' } : null), disabled)),

        attrBehavior(map((disabled) => ({ disabled }), disabled)),

        styleBehavior(
          map((active) => (active ? { borderColor: pallete.primary } : null), mergeArray([focusStyle, dismissstyle]))
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
