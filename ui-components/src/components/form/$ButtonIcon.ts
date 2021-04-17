
import { map, mergeArray } from "@most/core"
import { $Node, Behavior, component, event, INode, O, style, styleBehavior } from '@aelea/core'
import { dismissOp, interactionOp } from "./form"
import { $icon } from "../../elemets/$icon"
import designSheet from "../../style/designSheet"
import { pallete } from "@aelea/ui-components-theme"



export const $ButtonIcon = ($content: $Node) => component((
  [interactionBehavior, focusStyle]: Behavior<INode, true>,
  [dismissBehavior, dismissstyle]: Behavior<INode, false>,
  [sampleClick, click]: Behavior<INode, PointerEvent>
) => {

  const iconOp = O(
    designSheet.control,
    style({ cursor: 'pointer', fill: pallete.description, borderRadius: '50%', }),

    interactionBehavior(interactionOp),
    dismissBehavior(dismissOp),

    sampleClick(event('pointerup')),

    styleBehavior(
      map(
        active => active ? { borderColor: pallete.primary } : null,
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



