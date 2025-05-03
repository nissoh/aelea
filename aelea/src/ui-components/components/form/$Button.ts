import { map, mergeArray, never } from '@most/core'
import { O } from '../../../core/common.js'
import type { Behavior, Ops } from '../../../core/types.js'
import { $element, attrBehavior, component, nodeEvent, styleBehavior } from '../../../dom/index.js'
import type { $Node, IBranch, INode, IStyleCSS } from '../../../dom/types.js'
import { pallete } from '../../../ui-components-theme/globalState.js'
import { designSheet } from '../../style/designSheet.js'
import { dismissOp, interactionOp } from './form.js'
import type { Control } from './types.js'

export interface IButton extends Control {
  $content: $Node
  buttonStyle?: IStyleCSS
  buttonOp?: Ops<IBranch<HTMLButtonElement>, IBranch<HTMLButtonElement>>
}

export const $Button = ({ disabled = never(), $content, buttonOp = O() }: IButton) =>
  component(
    (
      [focusStyle, interactionTether]: Behavior<IBranch, true>,
      [dismissstyle, dismissTether]: Behavior<IBranch, false>,
      [click, clickTether]: Behavior<INode, PointerEvent>
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
