import { map, mergeArray, never } from "@most/core"
import { $Node, $element, attr, Behavior, component, event, INode, styleBehavior, IBranch } from '@aelea/core'
import { Control, dismissOp, interactionOp } from './form'
import * as designSheet from '../../common/stylesheet'


export interface Button extends Control {
  $content: $Node
  tagName?: 'button' | 'a'
}

export default ({ disabled$ = never(), $content, tagName = 'button' }: Button) => component((
  [interactionBehavior, focusStyle]: Behavior<IBranch, true>,
  [dismissBehavior, dismissstyle]: Behavior<IBranch, false>,
  [sampleClick, click]: Behavior<INode, PointerEvent>
) => {

  const $button = $element(tagName)(
    designSheet.btn,
    sampleClick(
      event('pointerup')
    ),
    styleBehavior(
      map(disabled => disabled ? { opacity: .4, pointerEvents: 'none' } : null, disabled$)
    ),

    attr(
      map(disabled => ({ disabled }), disabled$)
    ),

    styleBehavior(
      map(
        active => active ? { borderColor: designSheet.theme.primary } : null,
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

    { click }
  ]
})
