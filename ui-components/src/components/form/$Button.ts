import { map, mergeArray, never } from "@most/core"
import { $Node, $element, attr, Behavior, component, event, INode, styleBehavior, IBranch, attrBehavior } from '@aelea/core'
import { Control, dismissOp, interactionOp } from './form'
import { theme } from '@aelea/ui-components-theme'
import designSheet from "../../style/designSheet"


export interface IButton extends Control {
  $content: $Node,
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
        active => active ? { borderColor: theme.primary } : null,
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
