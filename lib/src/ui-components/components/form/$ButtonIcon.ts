
import { pallete } from "@aelea/ui-components-theme"
import { map, mergeArray } from "@most/core"
import { Behavior, O } from '../../../core'
import { $Node, component, INode, nodeEvent, style, styleBehavior } from '../../../dom'
import { $icon } from "../../elements/$icon"
import designSheet from "../../style/designSheet"
import { dismissOp, interactionOp } from "./form"



export const $ButtonIcon = ($content: $Node) => component((
  [focusStyle, interactionTether]: Behavior<INode, true>,
  [dismissstyle, dismissTether]: Behavior<INode, false>,
  [click, clickTether]: Behavior<INode, PointerEvent>
) => {

  const iconOp = O(
    designSheet.control,
    style({ cursor: 'pointer', fill: pallete.message, borderRadius: '50%', }),

    interactionTether(interactionOp),
    dismissTether(dismissOp),

    clickTether(nodeEvent('pointerup')),

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



