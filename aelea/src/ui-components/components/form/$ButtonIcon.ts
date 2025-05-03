import { map, mergeArray } from '@most/core'
import { O } from '../../../core/common.js'
import type { IBehavior } from "../../../core/combinator/behavior.js"
import { component, nodeEvent, style, styleBehavior } from '../../../core/index.js'
import type { INode } from '../../../core/types.js'
import type { $Node } from '../../../core/source/node.js'
import { pallete } from '../../../ui-components-theme/globalState.js'
import { $icon } from '../../elements/$icon.js'
import { designSheet } from '../../style/designSheet.js'
import { dismissOp, interactionOp } from './form.js'

export const $ButtonIcon = ($content: $Node) =>
  component(
    (
      [focusStyle, interactionTether]: IBehavior<INode, true>,
      [dismissstyle, dismissTether]: IBehavior<INode, false>,
      [click, clickTether]: IBehavior<INode, PointerEvent>
    ) => {
      const iconOp = O(
        designSheet.control,
        style({
          cursor: 'pointer',
          fill: pallete.message,
          borderRadius: '50%'
        }),

        interactionTether(interactionOp),
        dismissTether(dismissOp),

        clickTether(nodeEvent('pointerup')),

        styleBehavior(
          map((active) => (active ? { borderColor: pallete.primary } : null), mergeArray([focusStyle, dismissstyle]))
        )
      )

      const $buttonIcon = iconOp($icon({ $content }))

      return [
        $buttonIcon,

        { click }
      ]
    }
  )
