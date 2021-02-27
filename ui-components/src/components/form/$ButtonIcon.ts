
import { map, mergeArray } from "@most/core"
import { $Node, Behavior, component, event, INode, O, style, styleBehavior } from '@aelea/core'
import * as designSheet from '../../common/stylesheet'
import { dismissOp, interactionOp } from "./form"
import { $icon } from "./$icon"



export default ($content: $Node) => component((
  [interactionBehavior, focusStyle]: Behavior<INode, true>,
  [dismissBehavior, dismissstyle]: Behavior<INode, false>,
  [sampleClick, click]: Behavior<INode, PointerEvent>
) => {

  const iconOp = O(
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
  )

  const $buttonIcon = iconOp(
    $icon({ $content })
  )

  return [
    $buttonIcon,

    { click }

  ]
})

