import { map, mergeArray, never } from '@most/core'
import { O } from '../../../core/common.js'
import type { IOps } from '../../../core/types.js'
import type { IBehavior } from "../../../core/combinator/behavior.js"
import { $element, attrBehavior, component, nodeEvent, styleBehavior } from '../../../core/index.js'
import type { INode } from '../../../core/types.js'
import type { $Node } from '../../../core/source/node.js'
import type { IStyleCSS } from '../../../core/combinator/style.js'
import type { IBranch } from '../../../core/source/node.js'
import { pallete } from '../../../ui-components-theme/globalState.js'
import { designSheet } from '../../style/designSheet.js'
import { dismissOp, interactionOp } from './form.js'
import type { Control } from './types.js'

export interface IButton extends Control {
  $content: $Node
  buttonStyle?: IStyleCSS
  buttonOp?: IOps<IBranch<HTMLButtonElement>, IBranch<HTMLButtonElement>>
}

export const $Button = ({ disabled = never(), $content, buttonOp = O() }: IButton) =>
  component(
    (
      [focusStyle, interactionTether]: IBehavior<IBranch, true>,
      [dismissstyle, dismissTether]: IBehavior<IBranch, false>,
      [click, clickTether]: IBehavior<INode, PointerEvent>
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
