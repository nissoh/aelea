
import { map, mergeArray } from "@most/core"
import { O, Behavior } from '@aelea/core'
import { $Node, component, event, INode, style, styleBehavior } from '@aelea/dom'
import { dismissOp, interactionOp } from "./form"
import { $icon } from "../../elements/$icon"
import designSheet from "../../style/designSheet"
import { pallete } from "@aelea/ui-components-theme"



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

    clickTether(event('pointerup')),

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



