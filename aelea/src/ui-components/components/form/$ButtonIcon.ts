import { map, mergeArray } from '@most/core'
import { O } from '../../../core/common.js'
import type { Behavior } from '../../../core/types.js'
import { component, nodeEvent, style, styleBehavior } from '../../../dom/index.js'
import type { $Node, INode } from '../../../dom/types.js'
import { pallete } from '../../../ui-components-theme/globalState.js'
import { $icon } from '../../elements/$icon.js'
import { designSheet } from '../../style/designSheet.js'
import { dismissOp, interactionOp } from './form.js'

export const $ButtonIcon = ($content: $Node) =>
  component(
    (
      [focusStyle, interactionTether]: Behavior<INode, true>,
      [dismissstyle, dismissTether]: Behavior<INode, false>,
      [click, clickTether]: Behavior<INode, PointerEvent>
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
