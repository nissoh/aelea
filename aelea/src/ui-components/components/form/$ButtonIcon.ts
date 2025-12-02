import { map, merge, op } from '@/stream'
import type { IBehavior } from '@/stream-extended'
import { pallete } from '@/ui-components-theme'
import type { I$Slottable, ISlottable } from '@/ui-renderer-dom'
import { component, nodeEvent, style, styleBehavior } from '@/ui-renderer-dom'
import { $icon } from '../../elements/$icon.js'
import { designSheet } from '../../style/designSheet.js'
import { dismissOp, interactionOp } from './form.js'

export const $ButtonIcon = ($content: I$Slottable) =>
  component(
    (
      [focusStyle, interactionTether]: IBehavior<ISlottable, boolean>,
      [dismissstyle, dismissTether]: IBehavior<ISlottable, boolean>,
      [click, clickTether]: IBehavior<ISlottable, PointerEvent>
    ) => {
      return [
        op(
          $icon({ $content }),
          designSheet.control,
          style({
            cursor: 'pointer',
            fill: pallete.message,
            borderRadius: '50%'
          }),
          interactionTether(interactionOp),
          dismissTether(dismissOp),
          clickTether(src$ => nodeEvent('pointerup', src$)),
          styleBehavior(
            map(active => (active ? { borderColor: pallete.primary } : null), merge(focusStyle, dismissstyle))
          )
        ),

        { click }
      ]
    }
  )
