import { map, merge } from '@/stream'
import type { IBehavior } from '@/stream-extended'
import { pallete } from '@/ui-components-theme'
import type { I$Slottable, ISlottable } from '@/ui-renderer-dom'
import { $element, component, nodeEvent, style, styleBehavior } from '@/ui-renderer-dom'
import { $icon } from '../../elements/$icon.js'
import { designSheet } from '../../style/designSheet.js'
import { dismissOp, interactionOp } from './form.js'

export const $ButtonIcon = ($content: I$Slottable) =>
  component(
    (
      [focusStyle, interactionTether]: IBehavior<ISlottable<HTMLButtonElement>, boolean>,
      [dismissstyle, dismissTether]: IBehavior<ISlottable<HTMLButtonElement>, boolean>,
      [click, clickTether]: IBehavior<ISlottable<HTMLButtonElement>, PointerEvent>
    ) => {
      const $button = $element('button')(
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
          map(active => (active ? { borderColor: pallete.primary } : null), merge(focusStyle, dismissstyle))
        )
      )

      return [
        $button($icon({ $content })),

        { click }
      ]
    }
  )
