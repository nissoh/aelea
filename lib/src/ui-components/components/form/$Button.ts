import { never, mergeArray, map } from "@most/core"
import { O } from "../../../core/common.js"
import type { Op, Behavior } from "../../../core/types.js"
import { component, $element, nodeEvent, styleBehavior, attrBehavior } from "../../../dom/index.js"
import type { $Node, StyleCSS, IBranch, INode } from "../../../dom/types.js"
import { designSheet } from "../../index.js"
import { interactionOp, dismissOp } from "./form.js"
import type { Control } from "./types.js"



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
      nodeEvent('pointerup')
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
