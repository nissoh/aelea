import { map, merge } from '../../../stream/index.js'
import type { IBehavior } from '../../../stream-extended/index.js'
import { pallete } from '../../../ui-components-theme/index.js'
import type { I$Slottable, ISlottable } from '../../../ui-renderer-dom/index.js'
import { $element, component, nodeEvent, style, styleBehavior } from '../../../ui-renderer-dom/index.js'
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
