import { map, mergeArray, never } from "@most/core"
import { Behavior, O, Op } from '@aelea/core'
import { $Node, $element, component, event, INode, styleBehavior, IBranch, attrBehavior, StyleCSS } from '@aelea/dom'
import { dismissOp, interactionOp } from './form'
import { pallete } from '@aelea/ui-components-theme'
import designSheet from "../../style/designSheet"
import { Control } from "./types"


export interface IButton extends Control {
  $content: $Node,
  buttonStyle?: StyleCSS
  buttonOp?: Op<IBranch<HTMLButtonElement>, IBranch<HTMLButtonElement>>
}

export const $Button = ({ disabled = never(), $content, buttonOp = O() }: IButton) => component((
  [focusStyle, interactionTether]: Behavior<IBranch, true>,
  [dismissstyle, dismissTether]: Behavior<IBranch, false>,
  [click, clickTether]: Behavior<INode, PointerEvent>
) => {

  const $button = $element('button')(
    designSheet.btn,
    clickTether(
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

    interactionTether(interactionOp),
    dismissTether(dismissOp),
    buttonOp,
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
