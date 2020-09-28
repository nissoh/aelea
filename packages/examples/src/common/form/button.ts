import { map, empty, mergeArray } from "@most/core"
import { NodeStream, component, Behavior, DomNode, $element, style, attr, stylePseudo, $svg, event } from "fufu"
import { Control } from "../form"
import { interactionOp, dismissOp } from "./form.common"

import * as designSheet from '../style/stylesheet'

export interface Button extends Control {
  $content: NodeStream,
}

export const $Button = (props: Button) => component((
  [sampleClick, click]: Behavior<DomNode, PointerEvent>
) => [
    $element('button')(
      designSheet.btn,
      sampleClick(
        event('pointerup')
      ),
      style(
        props.disabled ? map(disabled =>
          disabled ? { opacity: .4, pointerEvents: 'none' } : null
          , props.disabled) : empty()
      ),
      attr(
        props.disabled ? map(disabled => ({ disabled }), props.disabled) : empty()
      ),
      stylePseudo(':hover', { border: `2px solid ${designSheet.theme.primary}` }),
      stylePseudo(':focus', { border: `2px solid ${designSheet.theme.primary}` }),
    )(
      props.$content
    ),
    {
      click
    }
  ]
)

const $svgiconStage = $svg('svg')(
  attr({ viewBox: '0 0 24 24' }),
  style({ width: '24px', height: '24px', })
)

export const $ButtonIcon = ($content: NodeStream) => component((
  [interactionBehavior, focusStyle]: Behavior<DomNode, true>,
  [dismissBehavior, dismissstyle]: Behavior<DomNode, false>,
  [sampleClick, click]: Behavior<DomNode, PointerEvent>
) => [
    $svgiconStage(
      designSheet.control,
      style({ fill: designSheet.theme.system, borderRadius: '50%', }),

      interactionBehavior(interactionOp),
      dismissBehavior(dismissOp),

      sampleClick(event('pointerup')),

      style(
        map(
          active => active ? { borderColor: designSheet.theme.primary } : null,
          mergeArray([focusStyle, dismissstyle])
        )
      ),

    )($content),
    {
      click
    }
  ]
)

