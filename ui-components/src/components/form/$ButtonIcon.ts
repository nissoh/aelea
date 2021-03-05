
import { map, mergeArray } from "@most/core"
import { $Node, Behavior, component, event, INode, O, style, styleBehavior } from '@aelea/core'
import { dismissOp, interactionOp } from "./form"
import { $icon, $trash } from "./$icon"
import designSheet from "../../style/designSheet"
import { theme } from "@aelea/ui-components-theme"



export const $ButtonIcon = ($content: $Node) => component((
  [interactionBehavior, focusStyle]: Behavior<INode, true>,
  [dismissBehavior, dismissstyle]: Behavior<INode, false>,
  [sampleClick, click]: Behavior<INode, PointerEvent>
) => {

  const iconOp = O(
    designSheet.control,
    style({ cursor: 'pointer', fill: theme.system, borderRadius: '50%', }),

    interactionBehavior(interactionOp),
    dismissBehavior(dismissOp),

    sampleClick(event('pointerup')),

    styleBehavior(
      map(
        active => active ? { borderColor: theme.primary } : null,
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

export const $TrashBtn = $ButtonIcon($trash)


