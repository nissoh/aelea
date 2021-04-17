import { map, mergeArray, never } from "@most/core"
import { $Node, $element, Behavior, component, event, INode, styleBehavior, IBranch, attrBehavior, StyleCSS } from '@aelea/core'
import { dismissOp, interactionOp } from './form'
import { pallete } from '@aelea/ui-components-theme'
import designSheet from "../../style/designSheet"
import { Control } from "./types"


export interface IButton extends Control {
  $content: $Node,
  buttonStyle?: StyleCSS
}

export const $Button = ({ disabled = never(), $content }: IButton) => component((
  [interactionBehavior, focusStyle]: Behavior<IBranch, true>,
  [dismissBehavior, dismissstyle]: Behavior<IBranch, false>,
  [sampleClick, click]: Behavior<INode, PointerEvent>
) => {

  const $button = $element('button')(
    designSheet.btn,
    sampleClick(
      event('pointerup')
    ),
    styleBehavior(
      map(disabled => disabled ? { opacity: .4, pointerEvents: 'none' } : null, disabled)
    ),

    attrBehavior(
      map(disabled => ({ disabled }), disabled)
    ),

    styleBehavior(
      map(
        active => active ? { borderColor: pallete.primary } : null,
        mergeArray([focusStyle, dismissstyle])
      )
    ),

    interactionBehavior(interactionOp),
    dismissBehavior(dismissOp)
  )

  return [
    $button(
      $content
    ),

    {
      click
    }
  ]
})
