import { map, mergeArray } from '@most/core'
import type { IBehavior } from '../../../core/combinator/behavior.js'
import { component, nodeEvent, style, styleBehavior } from '../../../core/index.js'
import type { I$Slottable, ISlottable } from '../../../core/source/node.js'
import { pallete } from '../../../ui-components-theme/globalState.js'
import { $icon } from '../../elements/$icon.js'
import { designSheet } from '../../style/designSheet.js'
import { dismissOp, interactionOp } from './form.js'

export const $ButtonIcon = ($content: I$Slottable) =>
  component(
    (
      [focusStyle, interactionTether]: IBehavior<ISlottable, true>,
      [dismissstyle, dismissTether]: IBehavior<ISlottable, false>,
      [click, clickTether]: IBehavior<ISlottable, PointerEvent>
    ) => {
      const iconOp = o(
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
