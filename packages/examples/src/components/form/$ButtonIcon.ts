
import { map, mergeArray } from "@most/core"
import { $ChildNode, component, Behavior, style, attr, $svg, event, NodeChild } from "fufu"
import { interactionOp, dismissOp } from "./form.common"

import * as designSheet from '../../common/stylesheet'

const $svgiconStage = $svg('svg')(
  attr({ viewBox: '0 0 24 24' }),
  style({ width: '24px', height: '24px', })
)

export default ($content: $ChildNode) => component((
  [interactionBehavior, focusStyle]: Behavior<NodeChild, true>,
  [dismissBehavior, dismissstyle]: Behavior<NodeChild, false>,
  [sampleClick, click]: Behavior<NodeChild, PointerEvent>
) => [
    $svgiconStage(
      designSheet.control,
      style({ cursor: 'pointer', fill: designSheet.theme.system, borderRadius: '50%', }),

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

