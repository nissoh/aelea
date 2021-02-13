
import { map, mergeArray } from "@most/core"
import { $Node, $svg, attr, Behavior, component, event, INode, style, styleBehavior } from '@aelea/core'
import * as designSheet from '../../common/stylesheet'
import { dismissOp, interactionOp } from "./form"


const $svgiconStage = $svg('svg')(
  attr({ viewBox: '0 0 24 24' }),
  style({ width: '24px', height: '24px', })
)

export default ($content: $Node) => component((
  [interactionBehavior, focusStyle]: Behavior<INode, true>,
  [dismissBehavior, dismissstyle]: Behavior<INode, false>,
  [sampleClick, click]: Behavior<INode, PointerEvent>
) => [

  $svgiconStage(
    designSheet.control,
    style({ cursor: 'pointer', fill: designSheet.theme.system, borderRadius: '50%', }),

    interactionBehavior(interactionOp),
    dismissBehavior(dismissOp),

    sampleClick(event('pointerup')),

    styleBehavior(
      map(
        active => active ? { borderColor: designSheet.theme.primary } : null,
        mergeArray([focusStyle, dismissstyle])
      )
    ),

  )($content),

  { click }

])

